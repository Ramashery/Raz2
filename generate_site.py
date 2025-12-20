import os
import json
import shutil
import re
import firebase_admin
from firebase_admin import credentials, firestore
from jinja2 import Environment, FileSystemLoader

# --- НАСТРОЙКА ---

try:
    # Пытаемся получить конфиг из переменных окружения или локального файла (если есть)
    cert_env = os.environ.get('FIREBASE_SERVICE_ACCOUNT')
    if cert_env:
        service_account_info = json.loads(cert_env)
        cred = credentials.Certificate(service_account_info)
    else:
        # Fallback для локального запуска, если ключ лежит рядом
        cred = credentials.Certificate('firebase-service-account.json') 
        
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Подключение к Firebase успешно.")
except Exception as e:
    print(f"ОШИБКА ПОДКЛЮЧЕНИЯ к Firebase: {e}")
    # В реальном продакшене здесь стоит остановить скрипт, но для тестов оставим
    # exit(1)

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
    """Загружает все данные из коллекций Firebase."""
    site_data = {}
    try:
        # 1. Загрузка главной
        home_doc = db.collection('home').document('content').get()
        if home_doc.exists:
            site_data['home'] = home_doc.to_dict()
        else:
            site_data['home'] = {}

        # 2. Загрузка коллекций
        collections = ['services', 'portfolio', 'blog', 'contact']
        for col in collections:
            docs = db.collection(col).stream()
            site_data[col] = []
            for doc in docs:
                doc_data = doc.to_dict()
                doc_data['id'] = doc.id # Сохраняем ID документа
                doc_data['collection_name'] = col

                # Обработка JSON-LD (если он сохранен как строка)
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
        print(f"Критическая ОШИБКА при загрузке данных: {e}")
        return None


def format_content(content_string):
    """
    Преобразует сырой текст в HTML (параграфы, видео, картинки).
    Аналог функции formatContentHtml из JS, чтобы статика выглядела корректно сразу.
    """
    if not content_string:
        return ""
    
    # Нормализация переносов строк
    content = str(content_string).replace('\r\n', '\n')
    # Разбиваем по двойным переносам (абзацы)
    blocks = re.split(r'\n{2,}', content)
    
    html_output = []
    
    for block in blocks:
        block = block.strip()
        if not block:
            continue
            
        # 1. Если это уже HTML тег, оставляем как есть
        if re.match(r'^<(p|div|h[1-6]|ul|ol|li|blockquote|hr|table|pre)', block, re.IGNORECASE):
            html_output.append(block)
            continue
            
        # 2. Проверка на YouTube ссылку (отдельной строкой)
        youtube_regex = r'^https?://(?:www\.|m\.)?(?:youtu\.be/|youtube\.com/(?:embed/|v/|watch\?v=|watch\?.*&v=|shorts/))([a-zA-Z0-9_-]{11}).*$'
        yt_match = re.match(youtube_regex, block)
        if yt_match:
            video_id = yt_match.group(1)
            # Используем те же стили, что и в JS
            embed_code = (
                f'<div class="embedded-video" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000; margin: 1.5em 0; border-radius: 4px; border: 1px solid var(--color-border);">'
                f'<iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" src="https://www.youtube.com/embed/{video_id}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>'
                f'</div>'
            )
            html_output.append(embed_code)
            continue
            
        # 3. Проверка на прямую ссылку на картинку (отдельной строкой)
        image_regex = r'^https?://[^<>"\'\s]+\.(?:jpg|jpeg|png|gif|webp|svg)\s*$'
        img_match = re.match(image_regex, block, re.IGNORECASE)
        if img_match:
            img_code = (
                f'<p style="margin: 1.5em 0;">'
                f'<img src="{block}" alt="Embedded content" style="max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 4px; border: 1px solid var(--color-border);" />'
                f'</p>'
            )
            html_output.append(img_code)
            continue
            
        # 4. Обычный текст -> параграф. Одиночные переносы заменяем на <br>
        text_content = block.replace('\n', '<br>')
        html_output.append(f'<p>{text_content}</p>')
        
    return "".join(html_output)


def generate_detail_page(item, all_data):
    collection_name = item['collection_name']
    lang = item.get('lang', 'en')
    slug = item.get('urlSlug', 'no-slug')

    # Формируем путь: public/lang/collection/slug/index.html
    # Для английского можно делать путь без префикса /en/, но у вас в структуре он есть.
    # Оставим как было в оригинале: /en/...
    lang_prefix = f"{lang}/"

    path = os.path.join(OUTPUT_DIR, lang_prefix, collection_name, slug, 'index.html')
    os.makedirs(os.path.dirname(path), exist_ok=True)

    try:
        # Подбор похожих статей (Related Posts)
        related_items = []
        pool = all_data.get('services', []) + all_data.get('blog', [])
        # Перемешиваем пул (псевдо-случайно) для разнообразия, если нужно, 
        # но для стабильности билда лучше не использовать random без seed.
        # Просто берем первые подходящие.
        
        for related_item in pool:
            if len(related_items) >= 3:
                break
            # Тот же язык, но другой slug
            if related_item.get('lang') == lang and related_item.get('urlSlug') != slug:
                related_items.append(related_item)

        html_content = template.render(
            page_type='detail',
            item=item,
            related_items=related_items,
            site_data=all_data,
            format_content=format_content # Передаем функцию форматирования
        )

        with open(path, 'w', encoding='utf-8') as f:
            f.write(html_content)

        print(f"✓ Page: {lang}/{collection_name}/{slug}")
    except Exception as e:
        print(f"[ERROR] Ошибка при рендере страницы {collection_name}/{slug}: {e}")


def generate_home_and_copy_assets(all_data):
    # 1. Генерация главной (index.html)
    home_path = os.path.join(OUTPUT_DIR, 'index.html')
    try:
        # Читаем шаблон главной (в вашем случае это исходный index.html)
        with open('index.html', 'r', encoding='utf-8') as f:
            original_html = f.read()
        
        home_data = all_data.get('home', {})
        
        # Простая замена SEO-тегов для главной
        seo_html = original_html.replace(
            '<title>Web Development & SEO Services in Tbilisi, Georgia | Digital Craft</title>',
            f'<title>{home_data.get("seoTitle", "Digital Craft")}</title>'
        )
        seo_html = seo_html.replace(
            'content="Professional website development and SEO for small and medium businesses in Tbilisi. Get a fast, modern, and results-driven website. Contact us for a free consultation!"',
            f'content="{home_data.get("metaDescription", "")}"'
        )

        with open(home_path, 'w', encoding='utf-8') as f:
            f.write(seo_html)
        print("✓ Главная страница создана.")
    except FileNotFoundError:
        print("! ВНИМАНИЕ: Исходный файл 'index.html' не найден.")

    # 2. Создание JSON-файла с данными (ДЛЯ SPA/ОПТИМИЗАЦИИ)
    # Это позволит клиенту загружать данные без Firebase SDK
    json_path = os.path.join(OUTPUT_DIR, 'data.json')
    try:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(all_data, f, ensure_ascii=False)
        print("✓ Файл data.json создан (для быстрой загрузки клиента).")
    except Exception as e:
        print(f"[ERROR] Ошибка при создании data.json: {e}")

    # 3. Копирование статических ассетов
    print("Копирование файлов...")
    ignore_list = [
        '.git', '.github', OUTPUT_DIR, '__pycache__',
        'generate_site.py', 'generate_site_debug.py',
        'template.html', 'index.html', # index.html уже обработан
        'firebase.json', 'README.md', 'firebase-service-account.json',
        '.gitignore', '.env'
    ]
    
    for item_name in os.listdir('.'):
        if item_name in ignore_list or item_name.endswith('.py'):
            continue
            
        source_path = os.path.join('.', item_name)
        dest_path = os.path.join(OUTPUT_DIR, item_name)
        
        try:
            if os.path.isfile(source_path):
                shutil.copy2(source_path, dest_path)
            elif os.path.isdir(source_path):
                # Если папка уже есть (создана генератором страниц), копируем внутрь аккуратно
                if os.path.exists(dest_path):
                     # shutil.copytree требует несуществующую папку, поэтому пропускаем
                     # или можно реализовать рекурсивное слияние, но обычно ассеты это css/js/img
                     pass 
                else:
                    shutil.copytree(source_path, dest_path)
        except Exception as e:
            print(f"Ошибка копирования {item_name}: {e}")


def main():
    print("--- START GENERATION ---")
    all_data = get_all_data()
    
    if not all_data:
        print("Нет данных. Генерация отменена.")
        return

    generate_home_and_copy_assets(all_data)

    collections_to_generate = ['services', 'portfolio', 'blog']
    for collection in collections_to_generate:
        if collection in all_data:
            for item in all_data[collection]:
                generate_detail_page(item, all_data)

    print("\n--- SITE GENERATED SUCCESSFULLY ---")


if __name__ == '__main__':
    main()
