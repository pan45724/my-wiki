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
  # 1. 代码仓库
  gogs:
    image: gogs/gogs
    container_name: gogs
    restart: unless-stopped
    ports:
      - "3000:3000"   # Web UI
      - "10022:22"    # SSH Git
    volumes:
      - ./data/gogs_data:/data
    environment:
      - TZ=Asia/Shanghai

  # 2. Jenkins 控制器
  jenkins:
    image: jenkins/jenkins:lts-jdk17 # 建议使用 LTS 版本
    container_name: jenkins
    restart: unless-stopped
    user: root
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

  # 3. 构建节点 (Agent)
  ci-java:
    build: 
      context: ./ci-java
      dockerfile: Dockerfile
    image: ci-java:1.0
    container_name: ci-java
    restart: unless-stopped
    ports:
      - "2222:22"     # SSH 连接端口
      - "8090:8080"   # 应用部署端口 (宿主机:容器)
    volumes:
      - ~/.m2:/root/.m2 # 挂载 Maven 缓存
    environment:
      - TZ=Asia/Shanghai
```

### 2.2 ci-java/Dockerfile (最终版)
> **重点**: 手动安装 Maven 以避免 apt 自动引入 JDK 21，同时配置 SSHD 用于 Jenkins 连接。

```dockerfile
FROM eclipse-temurin:17-jdk

LABEL maintainer="devops"

# 定义 Maven 版本
ARG MAVEN_VERSION=3.9.6
ARG BASE_URL=https://apache.osuosl.org/maven/maven-3/${MAVEN_VERSION}/binaries

# 1. 切换国内源
RUN sed -i 's/archive.ubuntu.com/mirrors.aliyun.com/g' /etc/apt/sources.list && \
    sed -i 's/security.ubuntu.com/mirrors.aliyun.com/g' /etc/apt/sources.list

# 2. 安装基础工具 (procps用于ps命令，openssh-server用于被连接)
RUN apt-get update && apt-get install -y \
    git curl unzip bash procps openssh-server \
    && rm -rf /var/lib/apt/lists/*

# 3. 手动安装 Maven (避免依赖 JDK 21)
RUN mkdir -p /usr/share/maven /usr/share/maven/ref \
 && curl -fsSL -o /tmp/apache-maven.tar.gz ${BASE_URL}/apache-maven-${MAVEN_VERSION}-bin.tar.gz \
 && tar -xzf /tmp/apache-maven.tar.gz -C /usr/share/maven --strip-components=1 \
 && rm -f /tmp/apache-maven.tar.gz \
 && ln -s /usr/share/maven/bin/mvn /usr/bin/mvn

# 4. SSH 服务配置 (核心)
RUN mkdir -p /var/run/sshd \
 && echo 'root:123456' | chpasswd \
 && sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config \
 && sed -i 's@session\s*required\s*pam_loginuid.so@session optional pam_loginuid.so@g' /etc/pam.d/sshd \
 && ssh-keygen -A

# 5. 环境变量
ENV MAVEN_HOME /usr/share/maven
ENV JAVA_HOME /opt/java/openjdk 

EXPOSE 22
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

## 4. 标准 Jenkins Pipeline 模板 (参考)

```groovy
pipeline {
    agent { label 'maven-node' } // 指定运行在我们配置的 ci-java 节点上
    
    stages {
        stage('Check Environment') {
            steps {
                script {
                    sh 'java -version'
                    sh 'mvn -version'
                }
            }
        }
        
        stage('Checkout') {
            steps {
                // 使用内部网络服务名 gogs，无需写 IP
                git branch: 'main', url: 'http://gogs:3000/admin/demo-project.git'
            }
        }
        
        stage('Build') {
            steps {
                sh 'mvn clean package -DskipTests'
            }
        }

        stage('Deploy') {
            steps {
                script {
                    echo '>>> 清理旧进程'
                    // 防止第一次运行没进程报错，加上 || true
                    sh 'ps -ef | grep demo | grep -v grep | awk "{print \$2}" | xargs -r kill -9 || true'
                    
                    echo '>>> 启动新服务'
                    withEnv(['JENKINS_NODE_COOKIE=dontKillMe']) {
                        dir('target') {
                            sh 'nohup java -jar demo-0.0.1-SNAPSHOT.jar > app.log 2>&1 &'
                        }
                    }
                    
                    // 简单的健康检查等待
                    sleep 10
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