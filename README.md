# 🥔 土豆兄弟 - Potato Survivor

一款参考 [Brotato（土豆兄弟）](https://store.steampowered.com/app/1942280/Brotato/) 的浏览器生存射击游戏。

## 玩法

- **WASD** 控制土豆移动，武器自动攻击最近敌人
- 每波敌人从四周涌来，坚持到倒计时结束
- 击杀敌人掉落 **材料 💰**，波次结束后进入 **商店**
- 在商店购买武器、属性升级，最多装备 **6 把武器**
- 相同武器可 **合成升级**（T1→T2→T3→T4）
- 共 **20 波**，最后一波出现 Boss 👹

## 角色

| 角色 | 特点 |
|------|------|
| 🥔 均衡土豆 | 全属性 +5% |
| 💪 斗士土豆 | 高生命、近战伤害 |
| 🎯 射手土豆 | 远程伤害、射程 |
| ⚡ 疾风土豆 | 高移速、攻速 |

## 武器

| 类型 | 武器 |
|------|------|
| 远程 | 🔫 手枪 · 冲锋枪 · 💥 霰弹枪 · ✨ 激光 · 🪄 魔杖 |
| 近战 | 🔪 短刀 · 🪓 战斧 · 🗡️ 长矛 |

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/YuanCheng-coder/new-project.git
cd new-project

# 启动本地服务器（需要 Python 3）
python3 -m http.server 8080

# 浏览器打开
open http://localhost:8080
```

也可以直接用 VS Code Live Server 或任意静态文件服务器打开 `index.html`。

## 技术栈

- HTML5 Canvas
- 原生 JavaScript (ES Modules)
- 无外部依赖

## 项目结构

```
new-project/
├── index.html          # 游戏入口
├── css/style.css       # UI 样式
├── js/
│   ├── main.js         # 入口 & UI 逻辑
│   ├── game.js         # 游戏引擎 & 波次
│   ├── entities.js     # 玩家、敌人、子弹
│   ├── constants.js    # 常量 & 数据定义
│   └── shop.js         # 商店系统
└── README.md
```

## License

MIT
