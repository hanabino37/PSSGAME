from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import os
import csv
import time

# 巡回範囲設定
start_num = 7001
end_num = 9000

# Chromeオプション設定
options = Options()
options.add_argument('--headless')  # ブラウザ非表示
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')

# ChromeDriver起動
driver = webdriver.Chrome(options=options)

# 保存先設定
download_folder = os.path.join(os.path.expanduser('~'), 'Downloads')
csv_filename = f'pworld_machine_list_{start_num}_{end_num}.csv'
csv_path = os.path.join(download_folder, csv_filename)

# CSVファイルオープン
with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(csvfile)

    # ヘッダー行
    writer.writerow(['機種名', 'メーカー', '導入月', '号機', 'タイプ'])

    # 番号start_num〜end_numを巡回
    for num in range(start_num, end_num + 1):
        url = f"https://www.p-world.co.jp/machine/database/{num}"
        print(f"アクセス中: {url}")
        try:
            driver.get(url)
            time.sleep(2)  # ページロード待機

            html = driver.page_source
            soup = BeautifulSoup(html, 'html.parser')

            # title取得
            title_text = soup.title.text if soup.title else ""
            print(f"title内容: {title_text}")

            # パチスロを含むタイトルだけ対象
            if 'パチスロ' not in title_text:
                print(f"スキップ: {url} (パチスロ含まず)")
                continue

            # 【最新版】機種名抽出ロジック（半角スペース区切り）
            title_main = title_text.replace('| P-WORLD', '').strip()

            if " " in title_main:
                kisyumei = title_main.split(" ")[0].strip()
            else:
                kisyumei = title_main.strip()

            # 各情報初期化
            maker = ""
            導入月 = ""
            gouki = ""
            taipu = ""

            kisyu_info = soup.find('div', class_='kisyuInfo')
            if kisyu_info:
                kisyu_table = kisyu_info.find('table', class_='kisyuInfo-grid')
                if kisyu_table:
                    td_list = kisyu_table.find_all('td')

                    for td in td_list:
                        text = td.get_text(strip=True)

                        if 'メーカー' in text:
                            a_tag = td.find('a')
                            if a_tag:
                                maker = a_tag.get_text(strip=True)

                        if '導入開始' in text:
                            a_tag = td.find('a')
                            if a_tag:
                                導入月 = a_tag.get_text(strip=True)

                type_table = kisyu_info.find('table', class_='typeName')
                if type_table:
                    type_rows = type_table.find_all('tr')
                    for type_row in type_rows:
                        type_cells = type_row.find_all('td')
                        if len(type_cells) >= 2:
                            type_label = type_cells[0].get_text(strip=True)
                            type_value = type_cells[1].get_text(strip=True)

                            if 'タイプ' in type_label:
                                gouki = type_value
                                taipu = type_value

            # データをCSVに保存
            writer.writerow([kisyumei, maker, 導入月, gouki, taipu])
            print(f"保存完了: {kisyumei}")

        except Exception as e:
            print(f"エラー発生: {url} ({e})")
            continue

# ブラウザ終了
driver.quit()

print(f"巡回完了！保存ファイル: {csv_filename}")
