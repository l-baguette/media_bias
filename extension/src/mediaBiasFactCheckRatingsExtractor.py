
import json
from playwright.sync_api import sync_playwright

def extract_news_sources(page, table_selector, bias_rating, ratingsDict):
    news_sources = page.query_selector_all(f'{table_selector} tr td a')
    for source in news_sources:
        source_name = source.inner_text().strip()
        ratingsDict[source_name] = bias_rating
        print(source_name)

def main():
    ratingsDict = {}

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        bias_categories = {
            "left": "https://mediabiasfactcheck.com/left/",
            "left-center": "https://mediabiasfactcheck.com/leftcenter/",
            "right": "https://mediabiasfactcheck.com/right/",
            "right-center": "https://mediabiasfactcheck.com/rightcenter/",
            "center": "https://mediabiasfactcheck.com/center/",
            "conspiracy": "https://mediabiasfactcheck.com/conspiracy/",
            "satire": "https://mediabiasfactcheck.com/satire/",
        }

        table_selector = "tbody"

        for bias, url in bias_categories.items():
            page.goto(url)
            extract_news_sources(page, table_selector, bias, ratingsDict)

        browser.close()

    with open("mediaBiasFactCheckRatings.json", "w") as outfile:
        json.dump(ratingsDict, outfile, indent=4)

if __name__ == "__main__":
    main()
