# ------------------------------
# 1. Build Stage (Mavenでビルド)
# ------------------------------
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app

# 依存関係のキャッシュを効かせるためにpomだけ先にコピー
COPY pom.xml .
COPY walkfind-common/pom.xml walkfind-common/
COPY walkfind-web/pom.xml walkfind-web/

# 依存関係のダウンロード
RUN mvn dependency:go-offline -B

# ソースコードをコピーしてビルド (テストはスキップして高速化)
COPY walkfind-common/src walkfind-common/src
COPY walkfind-web/src walkfind-web/src
RUN mvn package -DskipTests

# ------------------------------
# 2. Run Stage (実行用軽量イメージ)
# ------------------------------
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# ビルド成果物(JAR)をコピー
COPY --from=build /app/walkfind-web/target/*.jar app.jar

# ローカル保存用のディレクトリを作成
RUN mkdir -p local-storage

# 実行
ENTRYPOINT ["java", "-jar", "app.jar"]