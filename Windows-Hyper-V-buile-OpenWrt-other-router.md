这份文档基于您之前的实际操作经历整理而成，涵盖了从架构选择、环境准备、详细部署步骤到故障排查的全过程。

你可以将以下内容保存为 `OpenWrt_Gateway_Setup.md` 文件。

---

# Windows Hyper-V 部署 OpenWrt 旁路由（透明代理网关）技术文档

**版本**：1.0
**最后更新**：2025-11-26
**环境**：Windows 10/11 Pro, Hyper-V, ImmortalWrt (OpenWrt)

## 1. 项目目标
在 Windows 宿主机上通过 Hyper-V 运行一个 OpenWrt 虚拟机，作为局域网内的“旁路由”（Side Router）。局域网内的手机、电脑通过将网关指向该虚拟机，实现透明代理上网（科学上网），无需在终端设备上安装代理软件。

## 2. 架构拓扑
*   **主路由器 (Gateway)**: `192.168.1.1` (负责拨号、DHCP、基础防火墙)
*   **OpenWrt 旁路由 (VM)**: `192.168.1.2` (负责流量清洗、代理转发)
*   **终端设备**: `192.168.1.X` (网关指向 `192.168.1.2`)

## 3. 准备工作

### 3.1 开启 Hyper-V
Windows 必须是专业版或企业版。
管理员 PowerShell 执行：
```powershell
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All
```
*重启电脑生效。*

### 3.2 获取固件（避坑指南）
*   **原则**：**不要**使用 OpenWrt 官方原版（无插件，国内源难配置）。
*   **推荐**：使用 **ImmortalWrt** 或社区编译好的“高大全”版（集成 PassWall/OpenClash）。
*   **下载**：[ImmortalWrt Firmware Selector](https://firmware-selector.immortalwrt.org/)
    *   架构：`x86/64`
    *   文件：`combined-efi.img.gz`

### 3.3 镜像转换
OpenWrt 默认是 `.img` 格式，Hyper-V 需要 `.vhdx`。使用 Docker 转换（无需安装 qemu 工具）：
```powershell
# 假设镜像在 D:\vm
cd D:\vm
docker run --rm -v ${PWD}:/imgs unpronounceable/qemu-img convert -f raw -O vhdx /imgs/openwrt.img /imgs/openwrt.vhdx
```

---

## 4. 部署步骤

### 4.1 配置虚拟交换机
1.  打开 **Hyper-V 管理器** -> **虚拟交换机管理器**。
2.  新建 **“外部” (External)** 虚拟交换机，命名为 `LanBridge`。
3.  **关键点**：下拉选择当前**正在上网的物理网卡**。
4.  勾选“允许管理操作系统共享此网络适配器”。

### 4.2 创建虚拟机
1.  **新建虚拟机**：
    *   名称：`OpenWrt`
    *   代数：**第二代 (Generation 2)**
    *   内存：512 MB (取消动态内存)
    *   网络：选择 `LanBridge`
    *   硬盘：选择“使用现有虚拟硬盘”，指向 `openwrt.vhdx`
2.  **修改安全设置（重要）**：
    *   右键虚拟机 -> 设置 -> 安全。
    *   **取消勾选**“启用安全启动” (Enable Secure Boot)。如果不取消，无法启动。

### 4.3 初始化网络配置
启动虚拟机，待控制台停止滚动，按回车进入命令行。
修改网络配置文件：
```bash
vi /etc/config/network
```
按 `i` 编辑 `config interface 'lan'` 部分：
```text
option ipaddr '192.168.1.2'      # 旁路由IP
option netmask '255.255.255.0'
option gateway '192.168.1.1'     # 必须指向主路由
option dns '192.168.1.1'         # 必须指向主路由或公共DNS
```
保存退出 (`Esc` -> `:wq`) 并重启网络：
```bash
service network restart
```

### 4.4 Web端配置 & 代理设置
1.  浏览器访问 `http://192.168.1.2` (默认用户 root，密码通常为空或 password)。
2.  **防火墙修正**（解决部分设备无法上网）：
    *   菜单：网络 -> 防火墙 -> 自定义规则。
    *   添加：`iptables -t nat -I POSTROUTING -o eth0 -j MASQUERADE`
    *   重启防火墙。
3.  **PassWall 配置**：
    *   菜单：服务 -> PassWall。
    *   添加节点订阅。
    *   勾选“主开关”，选择 TCP/UDP 节点。
    *   点击页面底部的 **“保存并应用”**。

---

## 5. 常见问题与故障排查 (Troubleshooting)

### Q1: `opkg install` 报错 "Unexpected end of JSON input" 或 "SyntaxError"
*   **原因**：使用了 OpenWrt 官方纯净版，国内连接官方源超时/被墙，导致软件包列表损坏；或缺乏 SSL 支持库。
*   **解决方案**：
    *   **弃用** `opkg` 手动安装方案。
    *   **重刷** 集成好 PassWall 的固件（如 ImmortalWrt），开箱即用，避免依赖地狱。

### Q2: PassWall 显示 "TCP/UDP/DNS 未运行"
*   **现象**：勾选了开关，但状态栏全是红色“未运行”。
*   **原因 1：配置未应用**。必须点击页面最底部的“保存并应用”，仅勾选开关无效。
*   **原因 2：时间不同步（最常见）**。Vmess/Vless 协议要求客户端与服务器时间误差 < 90秒。Hyper-V 虚拟机休眠后时间常滞后。
*   **解决方案**：
    1.  去 **系统** -> **系统** -> 点击 **“同步浏览器时间”**。
    2.  回到 PassWall 重新点击“保存并应用”。

### Q3: 无法下载组件 / 百度连接检测失败
*   **原因**：OpenWrt 自身缺少网关或 DNS 配置，导致无法连接外网。
*   **解决方案**：检查 `/etc/config/network` 或 Web 端的 接口 -> LAN 设置，确保“IPv4 网关”指向了主路由器 IP。

### Q4: 手机连上无法上网，但能访问 OpenWrt 后台
*   **原因**：DNS 污染或 NAT 转发问题。
*   **解决方案**：
    1.  手机端 DNS **必须**手动填写为旁路由 IP (`192.168.1.2`)。
    2.  检查是否执行了 `iptables` 的 MASQUERADE 规则（见 4.4 节）。

---

## 6. 客户端连接示例

**Android / iOS / Windows WiFi 设置：**

| 设置项 | 值 | 说明 |
| :--- | :--- | :--- |
| **IP 设置** | 静态 (Static) | 必须手动指定 |
| **IP 地址** | 192.168.1.50 | 同网段任意空闲 IP |
| **子网掩码** | 255.255.255.0 | /24 |
| **路由器/网关** | **192.168.1.2** | **指向 OpenWrt** |
| **DNS** | **192.168.1.2** | **指向 OpenWrt (防污染)** |

---

## 7. 维护建议
1.  **快照备份**：配置完成后，在 Hyper-V 管理器中对虚拟机创建一个“检查点”（Checkpoint）。如果日后玩坏了，可以一键还原。
2.  **宿主机网络**：如果在 Windows 上使用 WiFi 连接，Hyper-V 桥接可能会不稳。建议宿主机使用**有线连接**主路由。


由于 Docker Desktop for Windows 的网络默认是 NAT 模式（走宿主机的网络出口），理论上，只要你的 Windows 宿主机本身的网关指向了 OpenWrt，Docker 容器也会自动具备翻墙能力。
修改 Windows 网关：
打开 Windows 网络设置 -> 适配器选项。
找到你的物理网卡 -> 属性 -> IPv4。
将网关设为 192.168.1.2，DNS 设为 192.168.1.2。
重启 Docker：
有时候 Docker 需要重启才能识别网络变化。
测试容器：
code
Powershell
docker run -it --rm curlimages/curl curl https://www.google.com
注意：这种方式不需要加 -e http_proxy。如果能通，说明最完美的透明代理已经生效。