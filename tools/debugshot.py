import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':1280,'height':900})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type in ('error','log') else None)
        await pg.goto('http://localhost:8080/' + (sys.argv[1] if len(sys.argv)>1 else 'artsheet.html'))
        try: await pg.wait_for_function('window.__ok === true', timeout=30000)
        except Exception as e: errs.append('timeout')
        await pg.screenshot(path='/tmp/debug.png'); print('\n'.join(errs) or 'ok'); await b.close()
asyncio.run(main())
