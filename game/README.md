# 阿祖喵斯快跑 - AZU-NYAS RUN

一款横屏节奏躲避游戏，支持触屏与鼠标操作，可直接部署到 GitHub Pages。

## 游戏玩法

- **上/下触控区**：点击对应区域消灭怪物
- **普通怪**：靠近玩家时隐身，需在消失前点击消灭
- **云雾怪**：有紫色云雾特效，隐身后彻底消失
- **Boss 怪**：出现时屏幕顶部显示血条，疯狂点击对应区域连击消耗血量

## 文件结构

```
game/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js
│   ├── game.js
│   ├── player.js
│   ├── effects.js
│   ├── ui.js
│   ├── assetLoader.js
│   └── monsters/
│       ├── normalMonster.js
│       ├── cloudMonster.js
│       └── bossMonster.js
└── assets/
    └── images/
        ├── player/player.png
        ├── backgrounds/bg.png
        └── monsters/{normal,cloud,boss}.png
```

## 导入图片

将你的图片按上方结构放置，游戏会自动加载。
详见 `assets/images/README.md`。

## GitHub Pages 部署

1. 将整个 `game/` 文件夹推送到 GitHub 仓库根目录
2. 进入仓库 Settings → Pages
3. Source 选择 `main` 分支，目录选 `/ (root)`
4. 保存后访问 `https://你的用户名.github.io/仓库名/` 即可
