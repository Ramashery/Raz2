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

# --- НАСТРОЙКА ---

# Firebase
try:
    if not firebase_admin._apps:
        # Этот блок будет использовать секрет FIREBASE_SERVICE_ACCOUNT в GitHub Actions
        service_account_info = json.loads(os.environ.get('FIREBASE_SERVICE_ACCOUNT'))
        cred = credentials.Certificate(service_account_info)
        firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Подключение к Firebase успешно.")
except Exception as e:
    print(f"ОШИБКА ПОДКЛЮЧЕНИЯ к Firebase: {e}")
    exit(1)

# Jinja2 (Шаблонизатор)
env = Environment(loader=FileSystemLoader('.'))
home_template = env.get_template('home_template.html')
detail_template = env.get_template('template.html')

# Папки и основные URL
OUTPUT_DIR = 'build_output'
BASE_URL = "https://digital-craft-tbilisi.site"
SUPPORTED_LANGS = ['en', 'ka', 'ru', 'ua']

# Настройки для Sitemap (используются как резервный вариант, если в админке пусто)
SITEMAP_CONFIG = {
    'home': {'priority': '1.0', 'changefreq': 'weekly'},
    'services': {'priority': '0.9', 'changefreq': 'monthly'},
    'portfolio': {'priority': '0.8', 'changefreq': 'yearly'},
    'blog': {'priority': '0.7', 'changefreq': 'monthly'},
    'contact': {'priority': '0.5', 'changefreq': 'yearly'},
}

# Очистка папки 'build_output' перед сборкой
if os.path.exists(OUTPUT_DIR):
    shutil.rmtree(OUTPUT_DIR)
os.makedirs(OUTPUT_DIR, exist_ok=True)


# --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

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
                doc_data['id'] = doc.id
                doc_data['collection_name'] = col

                if 'schemaJsonLd' in doc_data and isinstance(doc_data['schemaJsonLd'], str):
                    try:
                        doc_data['schemaJsonLd'] = json.loads(doc_data['schemaJsonLd'])
                    except json.JSONDecodeError:
                        doc_data['schemaJsonLd'] = None
                site_data[col].append(doc_data)

        print("Все данные из Firestore успешно загружены.")
        return site_data
    except Exception as e:
        print(f"Критическая ОШИБКА при загрузке данных: {e}")
        return None

def format_content(content_string):
    if not content_string:
        return ""
    processed_content = content_string.replace('\r\n', '\n')
    blocks = re.split(r'\n{2,}', processed_content)
    html_parts = []
    for block in blocks:
        trimmed_block = block.strip()
        if not trimmed_block:
            continue
        youtube_regex = r"https?:\/\/(?:www\.|m\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch?v=|watch\?.*&v=|shorts\/))([a-zA-Z0-9_-]{11})"
        image_regex = r"^https?:\/\/[^<>\s]+\.(?:jpg|jpeg|png|gif|webp|svg)\s*$"
        html_tag_regex = r"^\s*<(p|div|h[1-6]|ul|ol|li|blockquote|hr|table|pre)"
        youtube_match = re.match(youtube_regex, trimmed_block)
        image_match = re.match(image_regex, trimmed_block)
        html_match = re.match(html_tag_regex, trimmed_block, re.IGNORECASE)
        if html_match:
            html_parts.append(trimmed_block)
        elif youtube_match:
            video_id = youtube_match.group(1)
            embed_html = f'<div class="embedded-video" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000; margin: 1.5em 0; border-radius: 4px; border: 1px solid var(--color-border);"><iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" src="https://www.youtube.com/embed/{video_id}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>'
            html_parts.append(embed_html)
        elif image_match:
            img_html = f'<p style="margin: 1.5em 0;"><img src="{trimmed_block}" alt="Embedded content" style="max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 4px; border: 1px solid var(--color-border);" /></p>'
            html_parts.append(img_html)
        else:
            paragraph = '<p>' + trimmed_block.replace('\n', '<br>') + '</p>'
            html_parts.append(paragraph)
    return '\n'.join(html_parts)

def build_url_for_sitemap(page):
    lang_prefix = f"/{page['lang']}" if page.get('lang') and page['lang'] != 'en' else ""
    slug = page.get('urlSlug', '')
    collection = page.get('collection_name', '')
    
    # Формируем URL и гарантируем слэш в конце
    full_url = f"{BASE_URL}{lang_prefix}/{collection}/{slug}/"
    return full_url

# --- ФУНКЦИИ ГЕНЕРАЦИИ ---

def generate_home_page(all_data):
    try:
        home_data = all_data.get('home')
        if not home_data:
            print("[ERROR] Данные для главной страницы не найдены!")
            return
        sections_data = {
            'services': all_data.get('services', []),
            'portfolio': all_data.get('portfolio', []),
            'blog': all_data.get('blog', []),
            'contact': all_data.get('contact', [])
        }
        html_content = home_template.render(
            home=home_data,
            sections_data=sections_data
        )
        path = os.path.join(OUTPUT_DIR, 'index.html')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print("✓ Главная страница успешно сгенерирована.")
    except Exception as e:
        print(f"[ERROR] Ошибка при генерации главной страницы: {e}")

def generate_detail_page(item, all_data):
    collection_name = item['collection_name']
    lang = item.get('lang', 'en')
    slug = item['urlSlug']
    lang_prefix = f"{lang}/" if lang != 'en' else ""
    
    dir_path = os.path.join(OUTPUT_DIR, lang_prefix, collection_name, slug)
    os.makedirs(dir_path, exist_ok=True)
    path = os.path.join(dir_path, 'index.html')

    try:
        related_items = []
        pool = all_data.get('services', []) + all_data.get('blog', [])
        for related_item in pool:
            if len(related_items) >= 3: break
            if related_item.get('lang') == lang and related_item.get('urlSlug') != slug and 'urlSlug' in related_item:
                related_items.append(related_item)
        html_content = detail_template.render(
            item=item,
            related_items=related_items,
            format_content=format_content
        )
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"✓ Создана страница: {os.path.join(lang_prefix, collection_name, slug)}")
    except Exception as e:
        print(f"[ERROR] Ошибка при рендере страницы {collection_name}/{slug}: {e}")

def generate_sitemap_xml(pages_for_sitemap):
    urlset = Element('urlset', xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    urlset.set('xmlns:xhtml', "http://www.w3.org/1999/xhtml")

    # 1. Обработка главной страницы и ее языковых версий
    home_last_mod = date.today().isoformat()
    home_urls = {
        'en': f"{BASE_URL}/",
        'ka': f"{BASE_URL}/ka/",
        'ru': f"{BASE_URL}/ru/",
        'ua': f"{BASE_URL}/ua/"
    }
    
    for lang, loc_url in home_urls.items():
        url_el = SubElement(urlset, 'url')
        SubElement(url_el, 'loc').text = loc_url
        SubElement(url_el, 'lastmod').text = home_last_mod
        SubElement(url_el, 'changefreq').text = SITEMAP_CONFIG['home']['changefreq']
        SubElement(url_el, 'priority').text = SITEMAP_CONFIG['home']['priority']
        
        SubElement(url_el, 'xhtml:link', rel="alternate", hreflang="x-default", href=home_urls['en'])
        for alt_lang, alt_url in home_urls.items():
            SubElement(url_el, 'xhtml:link', rel="alternate", hreflang=alt_lang, href=alt_url)

    # 2. Группировка внутренних страниц по ключу перевода
    grouped_pages = {}
    single_pages = []
    for page in pages_for_sitemap:
        key = page.get('translationGroupKey')
        if key and key.strip():
            if key not in grouped_pages:
                grouped_pages[key] = []
            grouped_pages[key].append(page)
        else:
            single_pages.append(page)

    # 3. Генерация URL-блоков для сгруппированных страниц
    for group_key, pages_in_group in grouped_pages.items():
        hreflang_map = {p['lang']: build_url_for_sitemap(p) for p in pages_in_group}
        
        for page in pages_in_group:
            url_el = SubElement(urlset, 'url')
            SubElement(url_el, 'loc').text = build_url_for_sitemap(page)
            
            last_mod = page.get('lastModified', date.today().isoformat()).split('T')[0]
            SubElement(url_el, 'lastmod').text = last_mod

            default_config = SITEMAP_CONFIG.get(page['collection_name'], {'changefreq': 'monthly', 'priority': '0.7'})
            changefreq = page.get('sitemapChangefreq', default_config['changefreq'])
            SubElement(url_el, 'changefreq').text = changefreq
            
            priority = page.get('sitemapPriority', default_config['priority'])
            SubElement(url_el, 'priority').text = str(priority)

            for lang_code, url in hreflang_map.items():
                SubElement(url_el, 'xhtml:link', rel="alternate", hreflang=lang_code, href=url)

    # 4. Добавляем страницы, у которых не было translationGroupKey
    for page in single_pages:
        url_el = SubElement(urlset, 'url')
        SubElement(url_el, 'loc').text = build_url_for_sitemap(page)
        
        last_mod = page.get('lastModified', date.today().isoformat()).split('T')[0]
        SubElement(url_el, 'lastmod').text = last_mod

        default_config = SITEMAP_CONFIG.get(page['collection_name'], {'changefreq': 'monthly', 'priority': '0.7'})
        changefreq = page.get('sitemapChangefreq', default_config['changefreq'])
        SubElement(url_el, 'changefreq').text = changefreq
        
        priority = page.get('sitemapPriority', default_config['priority'])
        SubElement(url_el, 'priority').text = str(priority)

    # 5. Сохранение файла
    xml_string = tostring(urlset, 'utf-8')
    pretty_xml = minidom.parseString(xml_string).toprettyxml(indent="    ")
    output_path = os.path.join(OUTPUT_DIR, 'sitemap.xml')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(pretty_xml)
    print(f"✓ Карта сайта успешно сгенерирована: {output_path}")


# --- ОСНОВНОЙ СКРИПТ ---

def main():
    all_data = get_all_data()
    if not all_data:
        print("Не удалось получить данные. Генерация сайта отменена.")
        return

    generate_home_page(all_data)

    valid_pages_for_sitemap = []
    collections_to_generate = ['services', 'portfolio', 'blog', 'contact']

    for collection in collections_to_generate:
        if collection in all_data:
            for item in all_data[collection]:
                if item.get('urlSlug') and item.get('lang'):
                    generate_detail_page(item, all_data)
                    valid_pages_for_sitemap.append(item)
                else:
                    print(f"[WARNING] Пропущен элемент в '{collection}' (ID: {item.get('id', 'N/A')}) из-за отсутствия 'urlSlug' или 'lang'.")

    # copy_static_assets() # Раскомментируйте, если у вас есть эта функция

    print("\nПодготовка данных для sitemap.xml...")
    if valid_pages_for_sitemap:
        generate_sitemap_xml(valid_pages_for_sitemap)
    else:
        print("! Не найдено валидных страниц для создания sitemap.xml.")

    print("\nГенерация сайта полностью завершена!")


if __name__ == '__main__':
    main()
