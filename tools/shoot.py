import sys, asyncio
from playwright.async_api import async_playwright
# usage: python3 tools/shoot.py [times…]   env: PORT (default 8081), Q (extra query, e.g. '&taps=40:0,41:1')
import os
PORT = os.environ.get('PORT', '8081'); Q = os.environ.get('Q', '')
times = [float(x) for x in sys.argv[1:]] or [2, 9, 14, 22]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width':1280,'height':720})
        errs=[]
        pg.on('console', lambda m: errs.append(f'{m.type}: {m.text}') if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: errs.append(f'pageerror: {e}'))
        await pg.goto(f'http://localhost:{PORT}/?t=0{Q}')
        await pg.wait_for_function('window.__ready === true', timeout=20000)
        await pg.wait_for_timeout(300)
        for t in times:
            await pg.evaluate(f'window.__render({t})')
            # stop the RAF from overwriting: render then screenshot immediately via canvas data
            data = await pg.evaluate(f'''() => {{ window.__render({t}); const g=document.getElementById('game'), u=document.getElementById('ui');
              const c=document.createElement('canvas'); c.width=1280;c.height=720; const x=c.getContext('2d'); x.imageSmoothingEnabled=false;
              x.drawImage(g,0,0,1280,720); x.drawImage(u,0,0); return c.toDataURL('image/png'); }}''')
            import base64
            open(f'/home/user/realmsbound/screenshots/t{t:06.2f}.png','wb').write(base64.b64decode(data.split(',')[1]))
        # start screen
        pg2 = await b.new_page(viewport={'width':1280,'height':720})
        await pg2.goto(f'http://localhost:{PORT}/'); await pg2.wait_for_timeout(2500)
        await pg2.screenshot(path='/home/user/realmsbound/screenshots/start.png')
        print('\n'.join(errs) or 'no console errors')
        await b.close()
asyncio.run(main())
