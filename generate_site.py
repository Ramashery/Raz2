import os
import json
import shutil
import re
import firebase_admin
from firebase_admin import credentials, firestore
from jinja2 import Environment, FileSystemLoader

# --- НАСТРОЙКА ---
try:
    # Если запускаете локально и переменной нет, используйте файл ключа:
    # cred = credentials.Certificate('path/to/serviceAccountKey.json')
    service_account_info = json.loads(os.environ.get('FIREBASE_SERVICE_ACCOUNT'))
    cred = credentials.Certificate(service_account_info)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Подключение к Firebase успешно.")
except Exception as e:
    print(f"ОШИБКА ПОДКЛЮЧЕНИЯ к Firebase: {e}")
    # Если ошибка, не выходим, чтобы скрипт не падал при локальных тестах без ключа
    # exit(1) 

# Настройка шаблонизатора
env = Environment(loader=FileSystemLoader('.'))

# Папка для сгенерированных файлов
OUTPUT_DIR = 'public'
if os.path.exists(OUTPUT_DIR):
    shutil.rmtree(OUTPUT_DIR)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --- ФУНКЦИИ ---
def get_all_data():
    site_data = {}
    try:
        home_doc = db.collection('home').document('content').get()
        if home_doc.exists:
            site_data['home'] = home_doc.to_dict()

        collections = ['services', 'portfolio', 'blog', 'contact']
        for col in collections:
            docs = db.collection(col).stream()
            site_data[col] = []
            for doc in docs:
                doc_data = doc.to_dict()
                doc_data['collection_name'] = col
                doc_data['urlSlug'] = doc_data.get('urlSlug', doc.id) # Fallback if no slug
                
                if 'schemaJsonLd' in doc_data and doc_data['schemaJsonLd']:
                    schema_data = doc_data['schemaJsonLd']
                    if isinstance(schema_data, str):
                        try:
                            doc_data['schemaJsonLd'] = json.loads(schema_data)
                        except json.JSONDecodeError:
                            doc_data['schemaJsonLd'] = None
                site_data[col].append(doc_data)

        print("Все данные из Firestore успешно загружены.")
        return site_data
    except Exception as e:
        print(f"ОШИБКА при загрузке данных (возможно нет доступа): {e}")
        return {'home': {}, 'services': [], 'portfolio': [], 'blog': [], 'contact': []}

def format_content(content_string):
    if not content_string: return ""
    processed_content = content_string.replace('\r\n', '\n')
    blocks = re.split(r'\n{2,}', processed_content)
    html_output = []
    youtube_regex = re.compile(r'^https?:\/\/(?:www\.|m\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch?v=|watch\?.*&v=|shorts\/))([a-zA-Z0-9_-]{11}).*$')
    image_regex = re.compile(r'^https?:\/\/[^<>"\'\s]+\.(?:jpg|jpeg|png|gif|webp|svg)\s*$', re.IGNORECASE)
    html_tag_regex = re.compile(r'^<(p|div|h[1-6]|ul|ol|li|blockquote|hr|table|pre)', re.IGNORECASE)

    for block in blocks:
        trimmed_block = block.strip()
        if not trimmed_block: continue
        youtube_match = youtube_regex.match(trimmed_block)
        image_match = image_regex.match(trimmed_block)
        if html_tag_regex.match(trimmed_block):
            html_output.append(trimmed_block)
        elif youtube_match:
            video_id = youtube_match.group(1)
            html_output.append(f'<div class="embedded-video" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000; margin: 1.5em 0; border-radius: 4px; border: 1px solid var(--color-border);"><iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" src="https://www.youtube.com/embed/{video_id}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>')
        elif image_match:
            html_output.append(f'<p style="margin: 1.5em 0;"><img src="{trimmed_block}" alt="Embedded content" style="max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 4px; border: 1px solid var(--color-border);" /></p>')
        else:
            text_content = trimmed_block.replace('\n', '<br>')
            html_output.append(f'<p>{text_content}</p>')
    return "".join(html_output)

# --- ГЕНЕРАЦИЯ ---

def generate_detail_page(item, all_data, template):
    collection_name = item['collection_name']
    lang = item.get('lang', 'en')
    slug = item['urlSlug']
    lang_prefix = f"{lang}/" if lang != 'en' else "" # Изменил логику, чтобы en был в корне если нужно, или добавьте логику как у вас
    
    # Пути как у вас в main.js
    if lang == 'en':
        path = os.path.join(OUTPUT_DIR, 'en', collection_name, slug, 'index.html')
    else:
        path = os.path.join(OUTPUT_DIR, lang, collection_name, slug, 'index.html')

    os.makedirs(os.path.dirname(path), exist_ok=True)
    
    related_items = []
    pool = all_data.get('services', []) + all_data.get('blog', [])
    for related_item in pool:
        if len(related_items) >= 3: break
        if related_item.get('lang') == lang and related_item.get('urlSlug') != slug:
            related_items.append(related_item)

    html_content = template.render(
        page_type='detail',
        item=item,
        related_items=related_items,
        site_data=all_data,
        format_content=format_content
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html_content)

def generate_home_and_copy_assets(all_data):
    # 1. Копируем ассеты
    print("Копирование ассетов...")
    exclude_list = ['.git', '.github', OUTPUT_DIR, '__pycache__', 'generate_site.py', 'template.html', 'index.html', 'firebase.json', 'README.md', 'main.txt', 'firebase.txt', 'admin.txt', 'venv', '.env']
    for item_name in os.listdir('.'):
        if item_name not in exclude_list and not item_name.endswith('.py'):
            source_path = os.path.join('.', item_name)
            dest_path = os.path.join(OUTPUT_DIR, item_name)
            try:
                if os.path.isfile(source_path):
                    shutil.copy2(source_path, dest_path)
                elif os.path.isdir(source_path):
                    if os.path.exists(dest_path): shutil.rmtree(dest_path)
                    shutil.copytree(source_path, dest_path)
            except Exception as e:
                print(f"Ошибка копирования {item_name}: {e}")

    # 2. Генерируем главную страницу через ШАБЛОН, а не через replace
    print("Генерация index.html...")
    try:
        # Используем index.html как Jinja шаблон
        template = env.get_template('index.html')
        
        # Подготовка данных для слайдеров
        # Группируем элементы по языкам для каждого раздела
        sections_data = {}
        for section in ['services', 'portfolio', 'blog', 'contact']:
            items = all_data.get(section, [])
            grouped = {'en': [], 'ka': [], 'ru': [], 'ua': []}
            for item in items:
                l = item.get('lang', 'en')
                if l in grouped:
                    grouped[l].append(item)
            sections_data[section] = grouped

        home_data = all_data.get('home', {})
        
        html_content = template.render(
            page_type='home',
            item=home_data, # Данные главной страницы
            site_data=all_data,
            sections_data=sections_data, # Сгруппированные данные для циклов
            format_content=format_content
        )
        
        with open(os.path.join(OUTPUT_DIR, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(html_content)
        print("✓ Главная страница сгенерирована с контентом.")
        
    except Exception as e:
        print(f"[ERROR] Ошибка генерации главной: {e}")

def main():
    all_data = get_all_data()
    # Загружаем шаблон деталей
    detail_template = env.get_template('template.html')

    generate_home_and_copy_assets(all_data)

    collections_to_generate = ['services', 'portfolio', 'blog']
    for collection in collections_to_generate:
        if collection in all_data:
            for item in all_data[collection]:
                generate_detail_page(item, all_data, detail_template)

    print("\nГенерация сайта завершена!")

if __name__ == '__main__':
    main()
