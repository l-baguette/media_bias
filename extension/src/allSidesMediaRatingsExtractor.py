import asyncio
from playwright.async_api import async_playwright

async def scroll_to_bottom(page):
    previous_height = await page.evaluate("document.body.scrollHeight")
    while True:
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(750)  # initial wait of 0.75 seconds
        current_height = await page.evaluate("document.body.scrollHeight")
        print(current_height)
        if current_height == previous_height:
            await page.wait_for_timeout(1000)  # secondary wait of 1 sec
            current_height = await page.evaluate("document.body.scrollHeight")
            print("Second Test")
            if current_height == previous_height:
                await page.wait_for_timeout(1500)  # tertiary wait of 1.5 secs
                current_height = await page.evaluate("document.body.scrollHeight")
                print("Third Test")
                if current_height == previous_height:
                    await page.wait_for_timeout(2000)  # final wait of 2 secs
                    current_height = await page.evaluate("document.body.scrollHeight")
                    print("Final Test, breaking")
                    break
        previous_height = current_height

async def scrape_news_sources():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto('https://www.allsides.com/media-bias/ratings?field_featured_bias_rating_value=All&field_news_source_type_tid%5B%5D=2&field_news_source_type_tid%5B%5D=3&field_news_bias_nid_1%5B1%5D=1&field_news_bias_nid_1%5B2%5D=2&field_news_bias_nid_1%5B3%5D=3&title=')

        await scroll_to_bottom(page)

        sources_bias = {}
        
        await page.wait_for_selector('tr.odd')

        odd_rows = await page.query_selector_all('tr.odd')
        for row in odd_rows:
            name_element = await row.query_selector('td.views-field-title.source-title a')
            name = await name_element.inner_text()
            bias_element = await row.query_selector('td.views-field-field-bias-image a')
            bias_href = await bias_element.get_attribute('href')
            bias = bias_href.split('/')[-1]  #get bias
            sources_bias[name] = bias
            print(name)

        even_rows = await page.query_selector_all('tr.even')
        for row in even_rows:
            name_element = await row.query_selector('td.views-field-title.source-title a')
            name = await name_element.inner_text()
            bias_element = await row.query_selector('td.views-field-field-bias-image a')
            bias_href = await bias_element.get_attribute('href')
            bias = bias_href.split('/')[-1]  # get bias
            sources_bias[name] = bias
            print(name)

        await browser.close()

        return sources_bias

if __name__ == "__main__":
    result = asyncio.run(scrape_news_sources())
    result = dict(sorted(result.items()))
    print(result)

