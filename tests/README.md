# 回归检查

运行全部检查：`npm test`。使用 Node.js 内置测试器，无额外依赖。

文件按行为命名，不再以开发版本号作为主要入口。历史缺陷的回归断言保留，避免修复一个问题后重新引入旧问题。

| 范围 | 建议先读 |
| --- | --- |
| 摄像头与识别启动 | `vision-startup.test.mjs`、`timer-context.test.mjs`、`mobile-start.test.mjs` |
| 锁定与页面控制 | `locked-meter.test.mjs`、`controls-water.test.mjs`、`sound-hint.test.mjs` |
| 碰撞与运动 | `core.test.mjs`、`hands-flight.test.mjs`、`playback-contact.test.mjs` |
| 扁平花型完整性 | `flat-integrity.test.mjs`、`flat-admission-density.test.mjs`、`flat-bouquet-layout.test.mjs`、`flat-fall-physics.test.mjs` |
| 写实与礼物表现 | `original-trail.test.mjs`、`refined-look.test.mjs`、`materials-scatter.test.mjs` |
| 声音 | `rain-audio.test.mjs`、`recordings-overlap.test.mjs`、`contact-clarity.test.mjs` |
| 预算与发布资源 | `performance.test.mjs`、`layer-budget.test.mjs`、`publication.test.mjs`、`final-release.test.mjs` |

`helpers/` 是浏览器与音频的模拟环境；`fixtures/` 是固定参照数据，不进入线上包。模拟启动、离线物理及资源检查不能代替真实摄像头、iOS GPU 或长期运行测量。
