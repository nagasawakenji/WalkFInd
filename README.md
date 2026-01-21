#  WalkFind – Photo Contest Platform (Backend)

WalkFind は、
管理者が提示した「お題」にユーザーが写真を投稿し、ユーザー同士の投票で最もテーマに沿った作品を決めるコンテストアプリ
です。

このリポジトリは サーバーレス構成のバックエンド API を提供します。

## 🏗️ Monorepo Structure（モジュール構成）

WalkFind は複数モジュールに分割された構成をしています。

```
walkfind/
├── walkfind-common     ← 共通ドメインモデル & MyBatis Mapper
├── walkfind-web        ← ローカル開発用 Spring Boot Web アプリ
├── walkfind-lambda     ← AWS Lambda(SAM) 用 Spring Boot アプリ
├── walkfind-ml-worker  ← 類似度判定システム
└── walkfind-frontend   ← フロントエンド
```
### ✔ walkfind-common

アプリケーション全体で共通利用する ドメインモデル / DTO / MyBatis Mapper / 例外クラス を保持。  
•	Contest, User, UserPhoto などの Model  
•	DTO（ContestResponse, SubmitPhotoRequest など）  
•	MyBatis mapper interface  
•	Validation・ビジネス例外  

Lambda と Web の両方で使うデータモデルを共通化し、重複を防ぐためのモジュールです。

⸻

### ✔ walkfind-web

ローカル開発用の Spring Boot Web アプリ。  
•	cognitoの認証を最低限で実装  
•	開発時の動作確認（S3 Presign, 投稿、条件チェック等)  
•	統合テスト（Service 層のテスト）  

最低限のawsを使用したローカルで高速開発できる Web 実行モードです。

⸻

### ✔ walkfind-lambda

AWS で動作する サーバーレス（Lambda）版の Spring Boot アプリ  
•	StreamLambdaHandler による Lambda 起動  
•	Cognito Authorizer を利用した API Gateway 認証  
•	Presigned URL (GET/PUT)  
•	Supabase(PostgreSQL) への DB 接続  
•	Secrets Manager による DB 情報取得  
•   S3 による写真保存

本番環境・ステージングで動作する Lambda 用アプリです。

⸻

### ✔ walkfind-ml-worker

写真投稿時にembedding(512次元の特徴量ベクトル)を算出する機械学習ロジック  
•   elasticmq or SQS による非同期処理  
•   openclip による embedding 生成  

ローカル環境ではelasticmq、本番環境ではSQSが使用されています。

⸻

### ✔ walkfind-frontend

アプリのuiやフロント側のロジックを実装  
•   vercelによる自動CD機能(mainブランチにmerge時に実行)   
•   ReactによるUIの実装

## 🧱 Architecture Overview

WalkFind バックエンド全体の構成図は以下です。

![Image](https://github.com/user-attachments/assets/79be1140-4da8-412f-a772-a36d4c602c2a)

## 🛠️ Tech Stack

### ✔ Language / Framework
•	Java 17  
•	Spring Boot 3.x   
•	MyBatis  
•	Hibernate Validator (Bean Validation)  
•	Lombok  
•   TypeScript  
•   React  
•   Python

___

### ✔ Database / Migration

Supabase（PostgreSQL）

WalkFind の全データは Supabase の PostgreSQL を利用。

Flyway による DB Migration

CI/CD を考慮し、完全版 Schema を Flyway で管理しています。

flyway.properties:
```
flyway.url=${FLYWAY_URL}
flyway.user=${FLYWAY_USER}
flyway.password=${FLYWAY_PASSWORD}
flyway.locations=filesystem:src/main/resources/db/migration
```
マイグレーションファイル例：
```
src/main/resources/db/migration/
├── V1__Initial_Schema.sql
├── V2__Create_Table_contest_results.sql
├── V3__Create_Table_user_profiles.sql
└── V4__Create_Table_contest_model_photos.sql
...
```

### ✔ AWS / Serverless
•	AWS SAM（template.yml）  
•	AWS Lambda（Java 17）  
•	API Gateway（Cognito Authorizer）  
•	Amazon S3（Presigned URL）  
•	AWS Secrets Manager（Supabase接続情報）  
•	CloudWatch Logs  
•   AWS Simple Queue Service
___

###  API Endpoints（要約）

認証不要
```
GET /api/v1/contests
GET /api/v1/contests/{id}
GET /api/v1/results/{id}
GET /api/v1/users/{id}
POST /api/auth/cognito/login    ← Cognitoによるログイン
```

認証必要（Cognito）
```
POST /api/v1/contests/create              ← コンテスト作成
POST /api/v1/contests/{contestId}/photo   ← 写真投稿
POST /api/v1/modify                       ← 自身の作成したコンテスト情報修正
POST /api/v1/contests/modelPhoto          ← モデル写真の投稿
DELETE /api/v1/contests/{contestId}       ← 自身の作成したコンテストの削除
```

## 🗂️ Major Domain Models

Contest（コンテスト）  
•	タイトル  
•	ステータス（IN_PROGRESS, CLOSED_VOTING, ANNOUNCED）  
•	開始・終了日時  

UserPhoto（投稿写真）  
•	投稿者ID  
•	画像キー（S3）  
•	タイトル  
•	説明文  
•	投票数  

Vote  
•	ユーザーID  
•	PhotoID

ContestResult  
•	順位  
•	最終得点  
•	isWinner  

___

## 🔄 Core Logic

### ✔ Presigned URL（アップロード & ダウンロード）

Upload（PUT）

Lambda (S3UploadPresignService) が以下を生成：  
•	有効期限付き  
•	Content-Type 指定可能    
•	PUT 限定  

Download（GET）

Lambda (S3DownloadPresignService) が生成：  
•	公開バケットでなくても 安全に GET 可能

ローカル (walkfind-web) でも同じ手順でローカルストレージへ写真を保存

___

### ✔ 写真投稿のビジネスルール  
•	コンテスト開催中のみ投稿可能  
•	1ユーザー1投稿  
•	Controller 層で BeanValidation  
•	Service 層でビジネスルールチェック  
•	失敗時は SubmitPhotoStatus を返却  

___

### ✔ 結果集計

ResultCalculationService の主処理：  
1.	集計対象コンテストを取得  
2.	投票数の多い順にソート  
3.	同点の場合は投稿日時が早い方が優先
4.	contest_results に insertAll
5.	contest.status を CLOSED_VOTING に更新
6.	全てトランザクションで実施（ロールバック保証）

___

## 🧪 Test Strategy

### ✔ 使用技術
•	JUnit 5    
•	Mockito  
•	AssertJ

### ✔ Service 層テスト

以下のテストを網羅：  
•	ContestServiceTest  
•	CreatingContestServiceTest  
•	PhotoSubmissionServiceTest  
•	PhotoDisplayServiceTest  
•	ResultCalculationServiceTest  
•	ResultDisplayServiceTest  
•	ContestModelPhotoServiceTest  

これからも適宜追加していきます

___

## 🏠 Local Development

Web モジュール（開発用）
```
cd walkfind-web
./mvnw spring-boot:run
```
S3 ではなく ローカルストレージに保存しながら動作確認できる。
ローカルストレージはプロジェクト直下にフォルダを作成することを想定していますが、適宜調節してください。

## ☁️ AWS Deployment（SAM）
```
cd walkfind-lambda
sam build
sam deploy --guided
```
主なパラメータ：  
•	DbSecretArn（Supabase 接続情報)

## 🔐 Required Environment Variables 
```
DB_SECRET_ARN=arn:aws:secretsmanager:ap-northeast-1:xxxx
FLYWAY_URL=jdbc:postgresql://<supabase-host>:5432/postgres
FLYWAY_USER=postgres
FLYWAY_PASSWORD=<supabase-password>
```

## 今後の予定
・テストコードの拡充
・ログ監視設計の追記



