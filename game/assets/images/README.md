# assets/images — 图片导入说明

请将您的图片放入以下目录，文件名需与 `js/assetLoader.js` 中 `ASSET_MANIFEST` 对应。

```
assets/
└── images/
    ├── player/
    │   └── player.png          ← 玩家角色（推荐 120×120，透明底 PNG）
    │
    ├── backgrounds/
    │   └── bg.png              ← 背景图（推荐 1920×1080，横屏）
    │
    └── monsters/
        ├── normal.png          ← 普通怪（推荐 80×80，透明底 PNG）
        ├── cloud.png           ← 云雾怪（推荐 80×80，透明底 PNG）
        └── boss.png            ← Boss 怪（推荐 160×160，透明底 PNG）
```

## 注意事项

- 图片格式推荐 PNG（支持透明通道）
- 若图片未找到，游戏会自动生成彩色占位符，不会崩溃
- 如需修改文件名或路径，请编辑 `js/assetLoader.js` 中的 `ASSET_MANIFEST` 对象

## 音效（预留）

如需添加音效，可在 `assets/audio/` 目录下放置 MP3/OGG 文件，
并在 `assetLoader.js` 中扩展音频加载逻辑。

