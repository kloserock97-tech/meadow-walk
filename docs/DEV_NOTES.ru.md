# Meadow Walk — рабочие заметки

Внутренний документ: устройство, где крутить, замеры, грабли. Публичное описание — `README.md`.
Материалы разбора стороннего сайта, с которого начинался проект, лежат в `reference/_private/` и не публикуются (`.gitignore`).

## Запуск и проверка

```bash
npm install
npx vite --host 127.0.0.1 --port 5317
```

Порт 5190 на машине занят другим сервером, а `localhost` в Playwright уходит не туда — поэтому явно `127.0.0.1`.

## Устройство

```
CameraRig (priority -2)  бесконечная прогулка: извилистый путь, высота «дышит» 4,5–19 ед.,
                         наклон следует за высотой, камера держится над землёй по terrainCPU.js
HeightField (-1)         warped FBM → HalfFloat-текстура 512² вокруг камеры
Cursor (-1)              луч курсора → марш по JS-копии рельефа (terrainCPU.js);
                         uHead — купол под курсором, uWaves[16] — центры волн с возрастом,
                         uFieldBounds — прямоугольник, вне которого шейдеры цикл не считают
cursorFieldGLSL          (uniforms.js) одно поле для всех: гребень волны поднимает и сдвигает наружу
glsl/noise.js            свой градиентный шум на целочисленном хэше lowbias32 (public domain)
Terrain                  цвет луга по высоте/уклону/шуму, тропинки = изолинии (px через fwidth),
                         микрорельеф: конечные разности шума в мировых XZ
Water                    почти чёрные озерца, уровень медленно колеблется
Grass                    near 360k стеблей 26×26 (5 вершин, тени) + far 140k 70×70 (3 вершины)
Pebbles                  редкие камни вдоль тропинок и берега, катятся на волне
Dust                     пылинки ≥ 2 px, поднимаются волной
Sun                      низкое солнце, тени 4096
Effects                  DOF → Bloom → CA → ACES → десатурация → контраст → Grain → виньетка
Adaptive                 окна 1,5 с: FPS < 50 два окна — реже трава, > 58 три окна — гуще; плавно
Overlay + ambience.js    минимальный интерфейс, строки над лугом; ветер — шум → фильтры + LFO
```

## Где крутить

| Что | Файл, параметр |
|---|---|
| Путь и высота камеры | `CameraRig.jsx`: `SPEED`, `pathX`, `breath` (4,5–19), наклон `-15…-62°` |
| Волна курсора | `uniforms.js`: `WAVE_SPEED`, `WAVE_LIFE`; `Cursor.jsx`: `SPAWN_DIST`, `SPAWN_GAP` |
| Камни / трава на волне | `Pebbles.jsx`: `push * 0.9`, `lift`; `Grass.jsx`: `field.xy * 1.6` |
| Густота травы | `config.js`: `grassLayers` |
| Автоподстройка | `Adaptive.jsx`: `LEVELS`, `LOW_FPS`, `HIGH_FPS` |
| Цвета луга | `Terrain.jsx`: `grassDeep`… `path`; `Grass.jsx`: `gBase`, `gTip` |
| Строки текста | `Overlay.jsx`: `LINES`, `PERIOD` |
| Зерно, звук | `Effects.jsx`: `GrainEffect`; `ambience.js`: громкость `0.55` |

## Замеры (настоящий Chrome, CDP)

Chrome: `--remote-debugging-port=9340 --remote-allow-origins=* --user-data-dir=%TEMP%\tides-perf --disable-features=CalculateNativeWinOcclusion --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling --start-maximized`

```
node tools/cdp-fps.mjs --query "t=3&adaptive=0&level=0" --seconds 12       # FPS: уровень 0 ≈ 70, уровень 2 ≈ 90
node tools/cdp-record.mjs --query "t=0" --seconds 20 --out <папка> --mouse  # скринкаст + журнал кадров
FFMPEG=<ffmpeg.exe> node tools/black-frames.mjs <папка>                    # чёрные вспышки
node tools/notices.mjs lic.json                                           # пересобрать THIRD_PARTY_NOTICES.md
```

## Грабли

- `customProgramCacheKey` обязателен на каждом материале с `onBeforeCompile`.
- Шаг сетки рельефа = тексель карты высот, центр карты привязан к текселю — иначе вершины «плывут».
- Толщина тропинок — в пикселях (`|h − level| / fwidth(h)`).
- `terrainCPU.js` — копия `terrainHeight`: поменяли шейдер — поправьте JS. С целочисленным хэшем совпадение бит в бит (`Math.imul`, `>>> 0`).
- Трава с `DoubleSide`: обратная грань переворачивает нормаль → `normal = normalize(vNormal)`.
- **Чёрные вспышки кадра** = NaN в HDR-буфере + Bloom `mipmapBlur`. Был `pow(vGrassY, …)` от −1e-7. `pow` во фрагменте — только от `clamp(x, 0, …)`. Бисекция: `?fx=0` → `?off=bloom` → `?hide=grass`.
- **Рывок при смене качества** = `setDpr` на лету пересоздаёт буферы. Меняем только `instanceCount`.
- Штатный `Noise` мигал белым шумом; субпиксельные точки мерцают → свой `Grain.js`, точки ≥ 2 px.
- Проявление из темноты считать по реальному `delta`, а не по ограниченному `dt` — иначе на медленной машине сцена долго остаётся тёмной.
- Модули, импортированные из консоли страницы (`import('/src/…')`), — отдельные экземпляры, не те, что у приложения.
- Глобальный `WebSocket` в Node не держит процесс — в CDP-скриптах нужен `setInterval`-держатель. PNG-скриншот через CDP на большом окне подвисал, JPEG работает.
- FPS не мерить в Playwright.

## Авторские права — что проверено (16.09.2026)

- Зависимости: MIT / Zlib / ISC / BSD-3 / Apache-2.0 — разрешительные; тексты в `THIRD_PARTY_NOTICES.md`.
- Узнаваемые чужие фрагменты заменены: sin-хэш и константы градиентного шума, матрица поворота октав, хэш «without sine» в зерне, формула bump из three.js, коэффициенты розового шума. Оставлен только lowbias32 (public domain) с указанием автора.
- Интерфейс, сюжет и тексты — свои: нет глав, «skip», золотых капителей, раскладки референса; прогулка бесконечная.
- Скриншоты и разбор стороннего сайта — только в `reference/_private/` (в `.gitignore`).
- Не юридическая консультация: при коммерческом использовании стоит показать юристу.
