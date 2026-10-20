# dsh-power-mini

DSH 插件。在会话头工具区放一个电源按钮，点开是两项：**重启 DSH** / **退出 DSH**。

DSH 桌面版没有提供重启或退出的入口（只能从托盘退出），每次想重载插件都得托盘退出再点开，很麻烦——这个插件就是补上这两个按钮。

## 它做什么

- **重启 DSH**：Host 把交接信息写给一个分离的 helper 进程，helper 等响应落盘后结束旧壳、再拉起一个新壳。窗口关掉约两秒后新窗口出现。
- **退出 DSH**：同样的流程，只是不再拉起新壳，等同托盘「退出」。
- 有 agent 或 job 正在跑时，点击会先弹确认，避免打断进行中的任务；也可以绕过确认直接调用 API。
- 新窗口迟迟不出现时按钮上会提示，可以手动重启兜底。

## 它不做什么

- 不做托盘图标、不做系统级服务，只是会话头上的一个小按钮。
- 仅支持 Windows 桌面版 DSH（依赖桌面壳的进程模型）；Web / CLI 场景下按钮不会注册。

## 安装

本插件是一个 DSH **profile bundle**，需要装进 profile 才生效：

- **CLI**：`dsh plugin --profile <profile> add dsh-power-mini`（发布到 npm 后）或 `dsh plugin --profile <profile> add ./dsh-power-mini-<version>.tgz`（`npm pack` 产出）。
- **桌面应用**：用宿主的插件安装接口装。

注意：`desktop` profile 由 Electron 桌面应用独占管理，CLI 对它执行 `add` 会报
`profile "desktop" is managed exclusively by the Electron application`。装进桌面 profile 请走应用内安装。

装完**重启 DSH**（宿主侧代码只在启动时加载）；之后浏览器侧 `client.js` 每次页面加载重读，改完刷新即可生效。

## 工作原理

宿主侧在 `/dsh-power-mini` 前缀下提供 `GET /status`、`POST /restart`、`POST /quit` 三个路由（仅接受本机回环请求）。点击按钮时 Host 先应答、写好交接 JSON，再拉起一个分离的 helper；helper 负责结束旧壳进程，重启模式下还会用干净的环境变量重新拉起壳（剥掉 `ELECTRON_RUN_AS_NODE` 等注入变量）。

无第三方依赖，只用 Node 内置模块。
