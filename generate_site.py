import os
import json
import re
import shutil
from datetime import date
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom
import firebase_admin
from firebase_admin import credentials, firestore
from jinja2 import Environment, FileSystemLoader

# --- НАСТРОЙКИ ---
OUTPUT_DIR = 'public'
BASE_URL = "https://raz2raz2.web.app"
SUPPORTED_LANGS = ['en', 'ka', 'ru', 'ua']

# Инициализация Firebase (используем ваш файл ключей)
try:
    if not firebase_admin._apps:
        # Убедитесь, что файл ключа лежит в корне или прописан в env
        cred = credentials.Certificate('serviceAccountKey.json') 
        firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✓ Подключение к Firebase успешно.")
except Exception as e:
    print(f"✘ ОШИБКА Firebase: {e}. Проверьте наличие serviceAccountKey.json")
    exit(1)

# Настройка шаблонизатора Jinja2
env = Environment(loader=FileSystemLoader('.'))

# Очистка и создание папки public
if os.path.exists(OUTPUT_DIR):
    shutil.rmtree(OUTPUT_DIR)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --- ФУНКЦИИ ---

def format_content(content_string):
    """Преобразует текст в HTML: ссылки на фото -> <img>, ссылки YouTube -> <iframe>, текст -> <p>"""
    if not content_string: return ""
    processed = content_string.replace('\r\n', '\n')
    blocks = re.split(r'\n{2,}', processed)
    html_parts = []

    for block in blocks:
        trimmed = block.strip()
        if not trimmed: continue
        
        youtube_re = r"https?:\/\/(?:www\.|m\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch?v=|shorts\/))([a-zA-Z0-9_-]{11})"
        image_re = r"^https?:\/\/[^<>\s]+\.(?:jpg|jpeg|png|gif|webp|svg)\s*$"
        
        yt_match = re.match(youtube_re, trimmed)
        img_match = re.match(image_re, trimmed)

        if yt_match:
            video_id = yt_match.group(1)
            html_parts.append(f'<div class="embedded-video"><iframe src="https://www.youtube.com/embed/{video_id}" frameborder="0" allowfullscreen></iframe></div>')
        elif img_match:
            html_parts.append(f'<p><img src="{trimmed}" alt="Content image"></p>')
        elif trimmed.startswith('<'):
            html_parts.append(trimmed)
        else:
            html_parts.append(f'<p>{trimmed.replace("\n", "<br>")}</p>')
    return '\n'.join(html_parts)

def get_site_data():
    """Загружает все данные из Firebase"""
    data = {'home': {}, 'services': [], 'portfolio': [], 'blog': [], 'contact': []}
    home_doc = db.collection('home').document('content').get()
    if home_doc.exists: data['home'] = home_doc.to_dict()
    
    for col in ['services', 'portfolio', 'blog', 'contact']:
        docs = db.collection(col).stream()
        for doc in docs:
            item = doc.to_dict()
            item['id'] = doc.id
            item['collection_name'] = col
            data[col].append(item)
    return data

def generate_pages(data):
    """Генерирует все внутренние страницы"""
    template = env.get_template('template.html')
    valid_pages = []
    
    for col in ['services', 'portfolio', 'blog', 'contact']:
        for item in data[col]:
            if not item.get('urlSlug') or not item.get('lang'): continue
            
            # Определяем путь (например: public/en/services/web-dev/index.html)
            lang = item['lang']
            lang_dir = lang if lang != 'en' else 'en' # Для MPA всё кладем в языковые папки
            path_dir = os.path.join(OUTPUT_DIR, lang_dir, col, item['urlSlug'])
            os.makedirs(path_dir, exist_ok=True)
            
            # Рендерим страницу
            html = template.render(item=item, now=date.today, format_content=format_content, site_data=data)
            with open(os.path.join(path_dir, 'index.html'), 'w', encoding='utf-8') as f:
                f.write(html)
            valid_pages.append(item)
            print(f"  + Страница: /{lang_dir}/{col}/{item['urlSlug']}/")
    return valid_pages

def generate_home(data):
    """Генерирует главную страницу"""
    template = env.get_template('index_template.html')
    html = template.render(site_data=data, now=date.today)
    with open(os.path.join(OUTPUT_DIR, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    print("✓ Главная страница создана.")

def copy_assets():
    """Копирует стили, скрипты и картинки"""
    ignore = {'.git', OUTPUT_DIR, 'generate_site.py', 'template.html', 'index_template.html', 'firebase.json', 'serviceAccountKey.json'}
    for item in os.listdir('.'):
        if item not in ignore and not item.endswith('.py'):
            src = item
            dst = os.path.join(OUTPUT_DIR, item)
            if os.path.isdir(src):
                shutil.copytree(src, dst, dirs_exist_ok=True)
            else:
                shutil.copy2(src, dst)
    print("✓ Ассеты скопированы.")

def generate_sitemap(pages):
    """Создает sitemap.xml для Google"""
    urlset = Element('urlset', xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    today = date.today().isoformat()
    
    # Главная
    url = SubElement(urlset, 'url')
    SubElement(url, 'loc').text = f"{BASE_URL}/"
    SubElement(url, 'lastmod').text = today
    
    for p in pages:
        url = SubElement(urlset, 'url')
        loc = f"{BASE_URL}/{p['lang']}/{p['collection_name']}/{p['urlSlug']}/"
        SubElement(url, 'loc').text = loc
        SubElement(url, 'lastmod').text = today

    xmlstr = minidom.parseString(tostring(urlset)).toprettyxml(indent="  ")
    with open(os.path.join(OUTPUT_DIR, 'sitemap.xml'), 'w') as f:
        f.write(xmlstr)
    print("✓ Sitemap.xml создан.")

# --- ЗАПУСК ---
if __name__ == '__main__':
    print("Начало сборки сайта...")
    all_data = get_site_data()
    generate_home(all_data)
    pages = generate_pages(all_data)
    generate_sitemap(pages)
    copy_assets()
    print("\nСборка завершена! Все файлы в папке /public")
