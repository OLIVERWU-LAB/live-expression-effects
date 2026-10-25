# Vibe Coding · 直播特效

浏览器 AR 表情互动原型：微笑下雨，大笑放烟花，粒子与头部、人物轮廓及手部碰撞。提供写实、礼物、扁平三种风格。

[在线体验](https://oliverwu-lab.github.io/live-expression-effects/) · [Vibe Coding 复盘](docs/Vibe-Coding复盘.md) · [架构与性能](docs/架构与性能.md)

## 运行与检查

Node.js 20 或以上，无需安装运行依赖。

```sh
npm start
```

打开 `http://127.0.0.1:4173/`。线上摄像头需要 HTTPS；本地 localhost 可直接使用。允许摄像头后，笑容强度控制雨滴与烟花。左侧「锁定播放」用于检查单一模式，再次点击恢复表情控制。未启用摄像头的预览使用模拟输入。

```sh
npm run check
```

依次执行全部测试、资源完整性检查、静态构建。也可单独运行 `npm test`、`npm run verify:assets`、`npm run build`。构建输出在 `.pages/`，不会覆盖源码。

## 从哪里读代码

| 位置 | 内容 |
| --- | --- |
| [dist/app.mjs](dist/app.mjs) | 摄像头、表情状态、资源准备、动画与交互入口 |
| [dist/vision-session.mjs](dist/vision-session.mjs) | 识别会话、单帧调度、超时与恢复 |
| [dist/vision.worker.js](dist/vision.worker.js) | 人脸、人物分割和手部推理 |
| [dist/effects.mjs](dist/effects.mjs) | 粒子世界、运动、碰撞及生命周期 |
| [dist/firework-playback.mjs](dist/firework-playback.mjs) | 三种风格共用的发射编排 |
| [dist/renderer.mjs](dist/renderer.mjs) | 绘制入口，各风格渲染模块由此调用 |
| [dist/sound.mjs](dist/sound.mjs) | 视觉事件驱动的声音调度 |
| [tools/](tools/) | 本地服务、依赖清单、资源校验与构建 |
| [tests/](tests/README.md) | 启动、识别、碰撞、花型、音效和资源回归检查 |

`dist/` 存放直接在浏览器运行的原生 JavaScript 源码与资源，属于源目录；`.pages/` 才是生成的部署目录。仓库只包含本互动原型，答卷网站单独维护。

## 性能处理

- 人脸与辅助识别在 Worker 中运行，每通道最多一帧在途；暂停页面时暂停推理，返回时恢复。
- 粒子、画布像素、拖尾采样及声源均有上限；扁平烟花按单朵与圆周层分配预算，保留完整主结构。
- 礼物使用两张 WebP 图集，音频提前解码并复用，播放时不下载或重新解码素材。
- 构建仅复制实际依赖。66 个运行文件约 16.1 MB，其中压缩识别资源约 15.29 MB；人脸首次路径约 6.32 MB，辅助模型另计。图集约 419 KB，五段音频约 119 KB。
- 八项识别资源无损压缩后减少约 51.3%，已达到当前 gzip 等级9大小；解压后逐项校验 SHA-256。

模型、识别阈值和视觉效果保持已确认版本。最新源码整理未改动运行文件，构建产物与整理前逐字节一致。测试范围和局限见[维护与校验](docs/维护与校验.md)，不将离线检查等同于手机实机帧率。

## 文档

- [架构与性能](docs/架构与性能.md)：数据流、碰撞、预算与资源口径
- [交付说明](docs/交付说明.md)：体验入口和运行方式
- [Vibe Coding 复盘](docs/Vibe-Coding复盘.md)：200字以内，含核心纠偏指令
- [音效与许可](docs/音效与许可.md)：素材来源和第三方许可
- [历史调整记录](docs/history/)：过程留档，不作为当前行为说明
