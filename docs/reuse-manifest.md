# Phase 1 复用记录

参考仓库：ken-fs/voxel-survivors，提交 cf9f1fccbcb73487ff45b8e3a6619a19b000be86。

| 原路径 | 新路径 | 处理 | 许可 |
|---|---|---|---|
| lib/rng.js | src/vendor/voxel-survivors/rng.js | 原样复制；用于可重复碰撞压力测试及Phase 2刷怪 | MIT，© 2026 BubuAi |
| LICENSE | public/licenses/voxel-survivors-MIT.txt | 原样保存并随构建分发 | MIT |

Phase 0 中评估的 events.js 在 Phase 1 没有实际需求，尚未复制或改写；待战斗事件出现再决定实现。post.js、hitfx.js 和游戏粒子片段也没有复制。模拟、凸边界扫掠、相机、灰盒画面、输入和会话生命周期均为本工程新实现。

Three.js 通过锁定的 npm 包引入，未复制原项目 vendor。绝不自动带入 `.build-env`、GA、作者域名、排行榜、部署配置或宣传资产。

Phase 2补充：`core/events.js` 是本工程新写的单步事件收集函数，不复制原 `lib/events.js`，也不继承其模块级订阅表。射手、弹丸、判定、能量、脉冲及显示代码均为本工程新实现，未增加原游戏代码或第三方依赖。

Phase 3补充：四类AI、难度调度、计分与本机记录均为本工程新实现，继续仅复用原样rng.js。未新增代码或素材来源，原MIT通知继续随构建分发。

Phase 4A补充：直接从同一three npm包使用GLTFLoader、RoomEnvironment、EffectComposer、RenderPass、UnrealBloomPass、OutputPass等官方addons，不复制Voxel的后处理或角色。rng.js的hash01用于视觉粒子，不消耗模拟随机数。临时机械体、舞台装饰、粒子、轨迹和Web Audio均为新实现；无外部美术资产。
