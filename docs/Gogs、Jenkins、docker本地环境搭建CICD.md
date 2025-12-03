这是一份基于我们完整实战过程整理的 **Gogs、Jenkins、docker CI/CD 本地环境搭建**。你可以将其保存为 `README.md` 或录入团队 Wiki，作为后续维护和新人入手的参考。

---

# 📘 本地 Java CI/CD 环境搭建知识库

## 1. 项目简介
本项目基于 Docker Compose 在本地搭建了一套完整的轻量级 CI/CD 流水线。
*   **代码仓库**: Gogs (轻量级 Git 服务)
*   **CI/CD 核心**: Jenkins (LTS 版本)
*   **构建节点**: 自定义 Java Agent (基于 SSH 连接，集成 JDK 17 + Maven 3.9)
*   **网络架构**: 全容器化，通过 Docker Network 内部互通。

---

## 2. 核心配置文件

### 2.1 docker-compose.yml (最终版)
> **注意**: YAML 文件严禁使用 Tab 键缩进，必须使用空格。

```yaml
version: '3.8'

services:
  # 1. 代码仓库：Gogs
  gogs:
    image: gogs/gogs
    container_name: gogs
    restart: unless-stopped
    ports:
      - "3000:3000"   # Web 界面
      - "10022:22"    # SSH Git
    volumes:
      - ./data/gogs_data:/data
    environment:
      - TZ=Asia/Shanghai

  # 2. CI/CD 中心：Jenkins
  jenkins:
    image: jenkins/jenkins:jdk21  # 建议由 jdk21 改为 jdk17 保持一致性，或保持 jdk21 也可以(Jenkins自身运行环境)
    container_name: jenkins
    restart: unless-stopped
    user: root # 使用 root 以便操作 docker socket 或挂载卷权限
    ports:
      - "8080:8080"
      - "50000:50000"
    volumes:
      - ./data/jenkins_home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - TZ=Asia/Shanghai
    depends_on:
      - gogs

  # 3. 构建节点：Java Agent (通过 SSH 连接)
  ci-java:
    build: 
      context: ./ci-java
      dockerfile: Dockerfile
    image: ci-java:1.0
    container_name: ci-java
    restart: unless-stopped
    ports:
      - "2222:22" # 暴露给宿主机调试用，Jenkins 内部通过容器名访问
      - "8090:8080" # 宿主机端口:容器端口 (Java Web)
    volumes:
      # Windows 用户注意：路径通常是 /c/Users/你的用户名/.m2
      # Mac/Linux 用户： ~/.m2
      - C:/Users/pan/.m2:/root/.m2 
    environment:
      - TZ=Asia/Shanghai
```

### 2.2 ci-java/Dockerfile (最终版)
> **重点**: 手动安装 Maven 以避免 apt 自动引入 JDK 21，同时配置 SSHD 用于 Jenkins 连接。

```dockerfile
# ci-java/Dockerfile
FROM eclipse-temurin:17-jdk

LABEL maintainer="pan"

# 1. 切换国内源 (针对 Ubuntu Jammy/Focal 等版本，更通用的写法)
RUN sed -i 's/archive.ubuntu.com/mirrors.aliyun.com/g' /etc/apt/sources.list && \
    sed -i 's/security.ubuntu.com/mirrors.aliyun.com/g' /etc/apt/sources.list

# 2. 安装基础工具 + OpenSSH Server
RUN apt-get update && apt-get install -y \
    maven \
    git \
    curl \
    unzip \
    bash \
    openssh-server \
    && rm -rf /var/lib/apt/lists/*

# 3. 配置 SSH 服务
# 创建 sshd 运行目录
RUN mkdir /var/run/sshd
# 设置 root 用户密码为 "123456" (本地测试用，生产环境请用密钥)
RUN echo 'root:123456' | chpasswd
# 允许 root 远程登录
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
# 修复 SSH 登录可能出现 pam 相关的报错
RUN sed -i 's@session\s*required\s*pam_loginuid.so@session optional pam_loginuid.so@g' /etc/pam.d/sshd

# 生成 SSH 主机密钥 (防止部分系统因无密钥导致启动失败)
RUN ssh-keygen -A

# 4. 暴露端口
EXPOSE 22

# 5. 启动命令：启动 SSH 服务并保持在前台，防止容器退出
CMD ["/usr/sbin/sshd", "-D"]
```

---

## 3. 常见问题与解决方案 (Troubleshooting)

在搭建过程中，我们遇到了以下 6 个关键问题，以下是详细的排查与解决记录。

### Q1: Jenkins 无法连接构建节点 (SSH Connection Refused)
*   **现象**: Jenkins 添加节点后报错 `Connection refused` 或 `Connection is not established`。
*   **原因**:
    1.  基础镜像未安装 `openssh-server`。
    2.  SSHD 服务未启动（Docker 容器没有前台进程导致退出，或 `sshd` 缺少 `/var/run/sshd` 目录导致启动失败）。
*   **解决方案**:
    *   在 Dockerfile 中安装 `openssh-server`。
    *   **关键**: 执行 `RUN mkdir -p /var/run/sshd`。
    *   生成 Host Key: `RUN ssh-keygen -A`。
    *   CMD 命令使用 `/usr/sbin/sshd -D` 保持前台运行。

### Q2: Jenkins 启动报错 `DefaultCrumbIssuer`
*   **现象**: Jenkins 容器启动失败，日志显示 `class hudson.security.csrf.DefaultCrumbIssuer is missing its descriptor`。
*   **原因**: 之前运行过旧版本 Jenkins，留下了不兼容的配置文件 (`config.xml`)，新版 Jenkins 废弃了旧的 CSRF 配置。
*   **解决方案**:
    *   停止容器：`docker-compose down`
    *   **清除脏数据**: `rm -rf ./data/jenkins_home`
    *   重启容器让其重新生成配置。

### Q3: Maven 编译报错 `release version 17 not supported`
*   **现象**: `pom.xml` 指定 JDK 17，但构建失败。`mvn -v` 显示 Java 版本为 21。
*   **原因**: 在 Dockerfile 中使用 `apt-get install maven` 时，Ubuntu 源自动安装了 `openjdk-21-jdk` 作为依赖，并将其设为默认 Java 环境，覆盖了基础镜像的 JDK 17。
*   **解决方案**:
    *   **修改 Dockerfile**: 不使用 apt 安装 Maven，改为 `curl` 下载 Maven 二进制包并手动解压配置。
    *   **强制重构**: `docker-compose build --no-cache ci-java`。

### Q4: Jenkins 环境变量不生效 (找不到 java/mvn)
*   **现象**: SSH 登录后 Shell 是非交互式的，可能加载不到 `/etc/profile` 或 Dockerfile `ENV` 设置的变量。
*   **解决方案**:
    *   **在 Jenkins 节点配置中“锁死”变量**。
    *   进入 Jenkins -> Nodes -> 配置节点 -> Node Properties -> Environment variables：
        *   `JAVA_HOME`: `/opt/java/openjdk`
        *   `PATH+EXTRA`: `/usr/share/maven/bin:/opt/java/openjdk/bin`

### Q5: Docker Compose 报错 `found character that cannot start any token`
*   **现象**: 修改端口映射时报错，无法启动容器。
*   **原因**: YAML 文件中使用了 **Tab 键** 进行缩进。
*   **解决方案**:
    *   将所有 Tab 替换为 **空格** (通常是 2 个或 4 个空格)。

### Q6: 部署后进程被 Jenkins 杀掉 (CD 阶段)
*   **现象**: 流水线显示 Success，但后台并没有 Java 进程在运行。
*   **原因**: Jenkins 任务结束后，默认会通过 Process Tree Killer 杀掉该任务衍生的所有子进程。
*   **解决方案**:
    *   使用 `nohup` 后台运行。
    *   **关键**: 设置环境变量 `JENKINS_NODE_COOKIE=dontKillMe`，告诉 Jenkins 这是一个后台守护进程，不要查杀。

---

#### 第四步：配置 Jenkins 连接构建节点 (关键步骤)

我们需要把 `ci-java` 容器注册为 Jenkins 的一个 Agent。

1.  **进入节点管理**：
    *   Manage Jenkins (系统管理) -> Nodes (节点管理) -> New Node (新建节点)。
    *   节点名称：`java-agent`。
    *   类型：**Permanent Agent** (固定节点)。
    *   点击 Create。

2.  **节点配置详情**：
    *   **Remote root directory (远程工作目录)**: `/root/workspace`
    *   **Labels (标签)**: `maven-node` (这很重要，流水线里要用)。
    *   **Usage**: Only build jobs with label expressions matching this node (只允许绑定标签的任务)。
    *   **Launch method (启动方式)**: **Launch agents via SSH**.
        *   **Host**: `ci-java` (这是 Docker 内部的服务名)。
        *   **Credentials**: 点击 Add -> Jenkins。
            *   Kind: `Username with password`.
            *   Username: `root`
            *   Password: `123456` (我们在 Dockerfile 里设置的)。
            *   ID: `ci-java-root`
            *   Description: `Root for ci-java`
            *   点击 Add，然后在下拉框选中它。
        *   **Host Key Verification Strategy**: 选择 `Non verifying Verification Strategy` (本地测试不验证 Host Key)。
    *   点击 **Save**。

3.  **验证连接**：
    *   点击列表中的 `java-agent`。
    *   点击 "Launch agent"（如果没自动连接）。
    *   看日志，如果显示 "Agent successfully connected and online"，说明 Jenkins 成功通过 SSH 控制了 ci-java 容器。

#### 第五步：创建并运行流水线

1.  回到 Jenkins 首页 -> **New Item**。
2.  名称：`demo-pipeline`，选择 **Pipeline**。
3.  在 Pipeline Script 中输入以下脚本：
```groovy
pipeline {
    agent { 
        // 指定在我们将才配置的 ci-java 节点上运行
        label 'maven-node' 
    }
    
    stages {
        stage('Checkout') {
            steps {
                // 使用内部网络地址拉取代码
                // 注意：因为 ci-java 和 gogs 在同一网络，可以直接用服务名 gogs
                // 如果是公开库不需要凭证，私有库需要配置 Jenkins 凭证
                git branch: 'master', url: 'http://gogs:3000/panda/pan.git'
            }
        }
        
        stage('Build') {
            steps {
                // 验证环境
                sh 'java -version'
                sh 'mvn -version'
                
                // 执行构建 (假设项目根目录有 pom.xml)
                sh 'mvn clean package -DskipTests'
            }
        }
        
        stage('Deploy') {
            steps {
                script {
                    echo '----------- 停止旧服务 -----------'
                    // 尝试查找并杀死包含 .jar 的进程，|| true 表示如果没找到进程也不报错
                    // 注意：如果容器里没有 pkill 命令，可以用 ps + grep + kill 的组合
                    sh 'ps -ef | grep demo-0.0.1-SNAPSHOT.jar | grep -v grep | awk "{print \$2}" | xargs -r kill -9 || true'
                    
                    echo '----------- 启动新服务 -----------'
                    // JENKINS_NODE_COOKIE=dontKillMe 是关键！防止流水线结束后进程被杀
                    withEnv(['JENKINS_NODE_COOKIE=dontKillMe']) {
                        dir('target') {
                            // nohup: 后台运行
                            // > app.log 2>&1: 标准输出和错误输出都写入 app.log
                            // &: 让命令在后台执行
                            sh 'nohup java -jar demo-0.0.1-SNAPSHOT.jar > app.log 2>&1 &'
                        }
                    }
                    
                    echo '----------- 启动检查 (等待 10s) -----------'
                    sleep 10
                    // 打印日志看有没有报错
                    sh 'cat target/app.log' 
                }
            }
        }
    }
}
```

## 5. 维护命令速查

```bash
# 启动环境
docker-compose up -d

# 停止环境
docker-compose down

# 修改 Dockerfile 后强制重新构建 (非常重要)
docker-compose build --no-cache ci-java
docker-compose up -d

# 查看容器日志
docker logs -f jenkins
docker logs -f ci-java

# 进入容器内部调试
docker exec -it ci-java bash
```