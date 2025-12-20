import os
import json
import shutil
import re
import firebase_admin
from firebase_admin import credentials, firestore
from jinja2 import Environment, FileSystemLoader

# --- НАСТРОЙКА ---
try:
    service_account_info = json.loads(os.environ.get('FIREBASE_SERVICE_ACCOUNT'))
    cred = credentials.Certificate(service_account_info)
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Подключение к Firebase успешно.")
except Exception as e:
    print(f"ОШИБКА ПОДКЛЮЧЕНИЯ к Firebase: {e}")
    exit(1)

# Настройка шаблонизатора
env = Environment(loader=FileSystemLoader('.'))
template = env.get_template('template.html')

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

                if 'schemaJsonLd' in doc_data and doc_data['schemaJsonLd']:
                    schema_data = doc_data['schemaJsonLd']
                    if isinstance(schema_data, str):
                        try:
                            doc_data['schemaJsonLd'] = json.loads(schema_data)
                        except json.JSONDecodeError:
                            doc_data['schemaJsonLd'] = None

                site_data[col].append(doc_data)

        print("Все данные из Firestore успешно загружены и обработаны.")
        return site_data
    except Exception as e:
        print(f"Критическая ОШИБКА при загрузке данных: {e}")
        return None


def format_content(content_string):
    """
    Python-аналог функции formatContentHtml из main.js.
    Разбивает текст на абзацы, обрабатывает ссылки на изображения и YouTube.
    """
    if not content_string:
        return ""
    
    # Нормализация переносов строк
    processed_content = content_string.replace('\r\n', '\n')
    # Разбиение на блоки по двойному переносу строки
    blocks = re.split(r'\n{2,}', processed_content)
    
    html_output = []
    
    # Регулярки (как в JS)
    youtube_regex = re.compile(r'^https?:\/\/(?:www\.|m\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch?v=|watch\?.*&v=|shorts\/))([a-zA-Z0-9_-]{11}).*$')
    image_regex = re.compile(r'^https?:\/\/[^<>"\'\s]+\.(?:jpg|jpeg|png|gif|webp|svg)\s*$', re.IGNORECASE)
    html_tag_regex = re.compile(r'^<(p|div|h[1-6]|ul|ol|li|blockquote|hr|table|pre)', re.IGNORECASE)

    for block in blocks:
        trimmed_block = block.strip()
        if not trimmed_block:
            continue
            
        youtube_match = youtube_regex.match(trimmed_block)
        image_match = image_regex.match(trimmed_block)
        
        if html_tag_regex.match(trimmed_block):
            # Если блок уже начинается с HTML тега, оставляем как есть
            html_output.append(trimmed_block)
        elif youtube_match:
            video_id = youtube_match.group(1)
            html_output.append(
                f'<div class="embedded-video" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000; margin: 1.5em 0; border-radius: 4px; border: 1px solid var(--color-border);">'
                f'<iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" src="https://www.youtube.com/embed/{video_id}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>'
            )
        elif image_match:
            html_output.append(
                f'<p style="margin: 1.5em 0;"><img src="{trimmed_block}" alt="Embedded content" style="max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 4px; border: 1px solid var(--color-border);" /></p>'
            )
        else:
            # Обычный текст: заменяем одиночные переносы на <br> и оборачиваем в <p>
            text_content = trimmed_block.replace('\n', '<br>')
            html_output.append(f'<p>{text_content}</p>')
            
    return "".join(html_output)


def generate_detail_page(item, all_data):
    collection_name = item['collection_name']
    lang = item.get('lang', 'en')
    slug = item['urlSlug']

    lang_prefix = f"{lang}/"

    path = os.path.join(OUTPUT_DIR, lang_prefix, collection_name, slug, 'index.html')
    os.makedirs(os.path.dirname(path), exist_ok=True)

    print(f"[PAGE] {collection_name} | lang={lang} | slug={slug}")
    
    try:
        related_items = []
        # Объединяем сервисы и блог для похожих постов
        pool = all_data.get('services', []) + all_data.get('blog', [])
        for related_item in pool:
            if len(related_items) >= 3:
                break
            # Ищем совпадение по языку, но не саму текущую страницу
            if related_item.get('lang') == item.get('lang') and related_item.get('urlSlug') != item.get('urlSlug'):
                related_items.append(related_item)

        html_content = template.render(
            page_type='detail',
            item=item,
            related_items=related_items,
            site_data=all_data,
            format_content=format_content # Передаем новую функцию форматирования
        )

        with open(path, 'w', encoding='utf-8') as f:
            f.write(html_content)

    except Exception as e:
        print(f"[ERROR] Ошибка при рендере страницы {collection_name} | {lang} | {slug}: {e}")


def generate_home_and_copy_assets(all_data):
    home_path = os.path.join(OUTPUT_DIR, 'index.html')
    try:
        with open('index.html', 'r', encoding='utf-8') as f:
            original_html = f.read()
        home_data = all_data.get('home', {})
        seo_html = original_html.replace(
            '<title>Web Development & SEO Services in Tbilisi, Georgia | Digital Craft</title>',
            f'<title>{home_data.get("seoTitle", "Digital Craft")}</title>'
        )
        with open(home_path, 'w', encoding='utf-8') as f:
            f.write(seo_html)
        print("✓ Создана главная страница (на основе index.html)")
    except FileNotFoundError:
        print("! ВНИМАНИЕ: Исходный файл 'index.html' не найден.")
    except Exception as e:
        print(f"[ERROR] Ошибка при создании главной страницы: {e}")

    print("\nНачинаю копирование ассетов...")
    # Список исключений, чтобы не копировать мусор в public
    exclude_list = [
        '.git', '.github', OUTPUT_DIR, '__pycache__',
        'generate_site.py', 'generate_site_debug.py',
        'template.html', 'index.html',
        'firebase.json', 'README.md', 'main.txt', 'firebase.txt', 'admin.txt'
    ]
    
    for item_name in os.listdir('.'):
        if item_name not in exclude_list:
            source_path = os.path.join('.', item_name)
            dest_path = os.path.join(OUTPUT_DIR, item_name)
            try:
                if os.path.isfile(source_path):
                    shutil.copy2(source_path, dest_path)
                elif os.path.isdir(source_path):
                    if os.path.exists(dest_path):
                        shutil.rmtree(dest_path)
                    shutil.copytree(source_path, dest_path)
            except Exception as e:
                print(f"Ошибка копирования {item_name}: {e}")
    print("Копирование ассетов завершено.")


def main():
    all_data = get_all_data()
    if not all_data:
        print("Не удалось получить данные. Генерация сайта отменена.")
        return

    generate_home_and_copy_assets(all_data)

    collections_to_generate = ['services', 'portfolio', 'blog']
    for collection in collections_to_generate:
        if collection in all_data:
            for item in all_data[collection]:
                generate_detail_page(item, all_data)

    print("\nГенерация сайта полностью завершена!")


if __name__ == '__main__':
    main()