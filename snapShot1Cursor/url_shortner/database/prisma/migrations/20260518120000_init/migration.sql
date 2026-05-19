-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');

-- CreateEnum
CREATE TYPE "UrlStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'DISABLED');

-- CreateEnum
CREATE TYPE "AliasStatus" AS ENUM ('ACTIVE', 'GRACE', 'RELEASED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "profile_picture" TEXT,    
    "auth_provider" "AuthProvider" NOT NULL,
    "google_id" TEXT,
    "password_hash" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),      

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "urls" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "original_url" TEXT NOT NULL,
    "short_code" TEXT NOT NULL,
    "qr_code_url" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "UrlStatus" NOT NULL DEFAULT 'ACTIVE',
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "last_renewed_at" TIMESTAMPTZ(6),
    "link_password_hash" TEXT,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "creator_ip" INET NOT NULL,
    "creator_user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "urls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aliases" (
    "id" UUID NOT NULL,
    "alias" TEXT NOT NULL,
    "current_url_id" UUID,
    "first_used_at" TIMESTAMPTZ(6) NOT NULL,
    "last_used_at" TIMESTAMPTZ(6) NOT NULL,
    "grace_expires_at" TIMESTAMPTZ(6),
    "reuse_allowed" BOOLEAN NOT NULL DEFAULT false,
    "reuse_after" TIMESTAMPTZ(6),
    "status" "AliasStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clicks" (
    "id" BIGSERIAL NOT NULL,
    "url_id" UUID NOT NULL,
    "ip_address" INET NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "device_type" TEXT,
    "browser" TEXT,
    "referrer" TEXT,
    "clicked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "razorpay_payment_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_url_usage" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "creator_ip" INET,
    "usage_date" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "daily_url_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "urls_short_code_key" ON "urls"("short_code");

-- CreateIndex
CREATE INDEX "urls_user_id_created_at_idx" ON "urls"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "urls_creator_ip_created_at_idx" ON "urls"("creator_ip", "created_at" DESC);

-- CreateIndex
CREATE INDEX "urls_expires_at_idx" ON "urls"("expires_at");

-- CreateIndex
CREATE INDEX "urls_status_idx" ON "urls"("status");

-- CreateIndex
CREATE INDEX "urls_deleted_at_idx" ON "urls"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "aliases_alias_key" ON "aliases"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "aliases_current_url_id_key" ON "aliases"("current_url_id");

-- CreateIndex
CREATE INDEX "aliases_created_by_user_id_idx" ON "aliases"("created_by_user_id");

-- CreateIndex
CREATE INDEX "aliases_status_idx" ON "aliases"("status");

-- CreateIndex
CREATE INDEX "aliases_grace_expires_at_idx" ON "aliases"("grace_expires_at");

-- CreateIndex
CREATE INDEX "aliases_reuse_after_idx" ON "aliases"("reuse_after");

-- CreateIndex
CREATE INDEX "aliases_deleted_at_idx" ON "aliases"("deleted_at");

-- CreateIndex
CREATE INDEX "clicks_url_id_clicked_at_idx" ON "clicks"("url_id", "clicked_at" DESC);

-- CreateIndex
CREATE INDEX "clicks_clicked_at_idx" ON "clicks"("clicked_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_razorpay_payment_id_key" ON "subscriptions"("razorpay_payment_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_expires_at_idx" ON "subscriptions"("user_id", "expires_at" DESC);

-- CreateIndex
CREATE INDEX "subscriptions_user_id_status_idx" ON "subscriptions"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key" ON "auth_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "daily_url_usage_user_id_usage_date_key" ON "daily_url_usage"("user_id", "usage_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_url_usage_creator_ip_usage_date_key" ON "daily_url_usage"("creator_ip", "usage_date");

-- AddForeignKey
ALTER TABLE "urls" ADD CONSTRAINT "urls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aliases" ADD CONSTRAINT "aliases_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aliases" ADD CONSTRAINT "aliases_current_url_id_fkey" FOREIGN KEY ("current_url_id") REFERENCES "urls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_url_id_fkey" FOREIGN KEY ("url_id") REFERENCES "urls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_url_usage" ADD CONSTRAINT "daily_url_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
