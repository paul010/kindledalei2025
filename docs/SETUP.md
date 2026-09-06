# 在 Mac 上运行

本仓库包含原项目的 Electron 界面，以及大雷使用的 Mac 独立看板模式。以下步骤针对后者；Electron 界面保留上游实现，未验证 macOS 打包安装。

## 准备

- Node.js 24 或更新版本、Google Chrome。
- 本机安装 Codex CLI 并完成登录。凭据留在本机，勿复制到仓库。
- Kindle 已完成适配其型号及固件的准备，并安装 FBInk。本项目不提供越狱包。

```sh
git clone https://github.com/paul010/kindledalei2025.git
cd kindledalei2025
npm ci --ignore-scripts --omit=dev
mkdir -p out
```

在 `out/weather-location.json` 保存自己的城市配置。以下使用城市中心示例坐标，可自行修改，勿填写家庭精确地址：

```json
{"name":"北京","latitude":39.90,"longitude":116.40}
```

启动 600 × 800 中文看板：

```sh
DASH_PROFILE=codex DASH_WIDTH=600 DASH_HEIGHT=800 RENDER_INTERVAL=60 npm run supervisor
```

若找不到程序，通过 `CODEX_BIN` 和 `CHROME` 环境变量指定对应可执行文件的绝对路径。浏览器打开 `http://localhost:8787/dash.png` 查看生成结果；首次生成需稍等。端口默认 8787，可通过 `PORT` 修改。

服务用于可信局域网，不要将端口映射到公网；图片包含账户用量。Mac 和 Kindle 应在相互可访问的局域网中。

## Kindle

将 `kindle/dash-loop.sh` 复制到 Kindle USB 根目录。在 Kindle 的终端或脚本启动器中运行（把 `<MAC_LAN_IP>` 替换为自己 Mac 的局域网地址）：

```sh
PC='http://<MAC_LAN_IP>:8787/dash.png' INTERVAL=60 FULL_EVERY=10 sh /mnt/us/dash-loop.sh
```

脚本会寻找 FBInk，包括 `/mnt/us/libkh/bin/fbink`。屏幕尺寸不同的设备需要修改渲染尺寸与布局。

自启相关文件为 `kindle/dash-autostart.sh`、`kindle/kindle-dashboard.conf`，安装工具为 `scripts/kindle-autostart.js`。操作前阅读 [Kindle 安装文档](../KINDLE-INSTALLATION.md)。网络地址与 SSH 凭据通过本地配置提供，不提交。当前实拍证明显示效果，未完成重启自启的现场验证。

Mac 常驻运行可用 LaunchAgent：设置工作目录为克隆路径，启动本机 Node 执行 `scripts/supervisor.js`，配置上述环境变量及 `RunAtLoad`、`KeepAlive`。此方式在用户登录后启动。请使用自己的路径，不复制他人的 LaunchAgent 配置。

## 修改内容

- `backend/codex-page.js`：中文看板、额度卡片、Token 类比与猫咪轮换。
- `backend/weather.js`：天气采集、缓存和过期状态。
- `locales/zh-CN.json`：晨跑文案和猫咪名称。
- `render/assets/`：猫咪动作素材。
- `backend/collectors/codex.js`：本机 Codex 账户统计。

天气每 15 分钟采集；文案每 5 分钟轮换；宠物随每分钟截图更换。累计 Token 的书本类比是假设换算，不是实际阅读量。

## 验证与来源

```sh
npm test
```

原 Electron 开发模式需安装开发依赖；相关命令保留在 `package.json`。详细来源见 [项目首页](../README.md#从哪里来)，上游作者信息保留在包配置中。仓库公开可见不等于自动获得额外许可；代码与素材的使用条件仍需参考各来源。
