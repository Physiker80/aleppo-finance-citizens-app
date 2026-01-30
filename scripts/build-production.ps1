# نص بناء الإنتاج مع التشفير أثناء النقل (PowerShell)
# مديرية مالية حلب - نظام الاستعلامات والشكاوى

param(
    [switch]$SkipSSL,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "🚀 $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️ $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

Write-Step "بدء عملية البناء للإنتاج..."

try {
    # 1. تنظيف البناء السابق
    Write-Step "تنظيف ملفات البناء السابق..."
    if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
    if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
    if (Test-Path "node_modules\.cache") { Remove-Item -Recurse -Force "node_modules\.cache" }

    # 2. تثبيت التبعيات
    Write-Step "تثبيت التبعيات..."
    npm ci --only=production
    if ($LASTEXITCODE -ne 0) { throw "فشل في تثبيت التبعيات" }

    # 3. بناء التطبيق
    Write-Step "بناء التطبيق..."
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "فشل في بناء التطبيق" }

    # 4. إنشاء مجلدات الخادم
    Write-Step "إعداد هيكل الخادم..."
    New-Item -ItemType Directory -Force -Path "dist\server"
    New-Item -ItemType Directory -Force -Path "dist\config\nginx"
    New-Item -ItemType Directory -Force -Path "dist\config\ssl"

    # 5. نسخ ملفات الخادم
    Write-Step "نسخ ملفات الخادم..."
    if (Test-Path "src\server") {
        Copy-Item -Recurse "src\server\*" "dist\server\"
    } else {
        Write-Warning "لا توجد ملفات خادم للنسخ"
    }

    if (Test-Path "middleware\security.ts") {
        Copy-Item "middleware\security.ts" "dist\server\"
    } else {
        Write-Warning "لا يوجد ملف middleware للنسخ"
    }

    # 6. نسخ إعدادات Nginx
    Write-Step "نسخ إعدادات Nginx..."
    if (Test-Path "config\nginx") {
        Copy-Item "config\nginx\*" "dist\config\nginx\"
    } else {
        Write-Warning "لا توجد ملفات Nginx للنسخ"
    }

    # 7. إنشاء شهادات SSL للتطوير
    if (-not $SkipSSL -and -not (Test-Path "config\ssl\localhost.crt")) {
        Write-Step "إنشاء شهادات SSL للتطوير..."
        New-Item -ItemType Directory -Force -Path "config\ssl"
        
        # التحقق من وجود OpenSSL
        try {
            $null = Get-Command openssl -ErrorAction Stop
            
            # إنشاء مفتاح خاص
            openssl genrsa -out "config\ssl\localhost.key" 2048
            
            # إنشاء شهادة موقعة ذاتياً
            openssl req -new -x509 -key "config\ssl\localhost.key" -out "config\ssl\localhost.crt" -days 365 -subj "/CN=localhost/O=Syrian Finance Ministry/C=SY"
            
            Write-Success "تم إنشاء شهادات SSL للتطوير"
        } catch {
            Write-Warning "OpenSSL غير مثبت. سيتم تخطي إنشاء شهادات SSL"
            Write-Warning "لتثبيت OpenSSL: choco install openssl أو تحميل من https://slproweb.com/products/Win32OpenSSL.html"
        }
    } elseif (Test-Path "config\ssl\localhost.crt") {
        Write-Success "شهادات SSL موجودة مسبقاً"
    }

    # 8. نسخ شهادات SSL
    if (Test-Path "config\ssl") {
        Copy-Item "config\ssl\*" "dist\config\ssl\"
    } else {
        Write-Warning "لا توجد شهادات SSL للنسخ"
    }

    # 9. إنشاء package.json للإنتاج
    Write-Step "إنشاء package.json للإنتاج..."
    $productionPackageJson = @{
        name = "aleppo-finance-system-production"
        version = "1.0.0"
        description = "نظام الاستعلامات والشكاوى - مديرية مالية حلب"
        main = "server/app.js"
        type = "module"
        scripts = @{
            start = "node server/app.js"
            "start:https" = "set NODE_ENV=production && node server/app.js"
            health = "powershell -Command `"try { Invoke-WebRequest -Uri http://localhost:3000/api/health -UseBasicParsing } catch { exit 1 }`""
        }
        dependencies = @{
            express = "^4.19.2"
            helmet = "^8.1.0"
            cors = "^2.8.5"
            compression = "^1.7.4"
            "express-rate-limit" = "^8.1.0"
        }
    } | ConvertTo-Json -Depth 4

    $productionPackageJson | Out-File -FilePath "dist\package.json" -Encoding utf8

    # 10. إنشاء Dockerfile للإنتاج
    Write-Step "إنشاء Dockerfile..."
    $dockerfileContent = @"
# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build

# Production image
FROM nginx:1.25-alpine

# Install Node.js for the app server
RUN apk add --no-cache nodejs npm

# Copy nginx configuration
COPY config/nginx/finance-system.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Node.js server
COPY --from=builder /app/dist/server /app/server
COPY --from=builder /app/dist/package.json /app/

# Install production dependencies for server
WORKDIR /app
RUN npm install --only=production

# Create SSL directory
RUN mkdir -p /etc/ssl/certs /etc/ssl/private

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/api/health || exit 1

# Expose ports
EXPOSE 80 443 3000

# Start both nginx and node server
CMD ["sh", "-c", "nginx -g 'daemon off;' & node server/app.js"]
"@

    $dockerfileContent | Out-File -FilePath "Dockerfile" -Encoding utf8

    # 11. إنشاء .dockerignore
    Write-Step "إنشاء .dockerignore..."
    $dockerignoreContent = @"
node_modules
npm-debug.log
dist
build
.git
.gitignore
README.md
Dockerfile
.dockerignore
android
.env.local
.env.development
coverage
.nyc_output
"@

    $dockerignoreContent | Out-File -FilePath ".dockerignore" -Encoding utf8

    # 12. تحديد الأذونات (Windows)
    Write-Step "تعيين الأذونات الآمنة..."
    if (Test-Path "config\ssl\*.key") {
        Get-ChildItem "config\ssl\*.key" | ForEach-Object {
            icacls $_.FullName /inheritance:r /grant:r "$($env:USERNAME):F" /T
        }
    }

    # 13. إنشاء معلومات البناء
    Write-Step "إنشاء معلومات البناء..."
    
    # الحصول على معلومات Git
    $gitCommit = "unknown"
    $gitBranch = "unknown"
    
    try {
        $gitCommit = (git rev-parse --short HEAD 2>$null) -replace "`r`n", ""
        $gitBranch = (git branch --show-current 2>$null) -replace "`r`n", ""
    } catch {
        # تجاهل أخطاء Git
    }
    
    $buildInfo = @{
        buildTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        buildHost = $env:COMPUTERNAME
        gitCommit = $gitCommit
        gitBranch = $gitBranch
        nodeVersion = (node --version) -replace "`r`n", ""
        npmVersion = (npm --version) -replace "`r`n", ""
        environment = "production"
        features = @{
            https = $true
            securityHeaders = $true
            rateLimit = $true
            compression = $true
            staticServing = $true
        }
    } | ConvertTo-Json -Depth 4

    $buildInfo | Out-File -FilePath "dist\build-info.json" -Encoding utf8

    Write-Success "تم البناء بنجاح!"
    Write-Host ""
    Write-Host "📁 الملفات المبنية في: dist\" -ForegroundColor Cyan
    Write-Host "🔧 لتشغيل الخادم: cd dist && npm start" -ForegroundColor Cyan
    Write-Host "🔐 للتشغيل مع HTTPS: cd dist && npm run start:https" -ForegroundColor Cyan
    Write-Host "🐳 لبناء Docker image: docker build -t aleppo-finance-system ." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 معلومات البناء:" -ForegroundColor Yellow
    
    $buildInfoDisplay = Get-Content "dist\build-info.json" | ConvertFrom-Json
    Write-Host "  📅 وقت البناء: $($buildInfoDisplay.buildTime)" -ForegroundColor Gray
    Write-Host "  🔖 Git Commit: $($buildInfoDisplay.gitCommit)" -ForegroundColor Gray
    Write-Host "  🌍 البيئة: $($buildInfoDisplay.environment)" -ForegroundColor Gray

} catch {
    Write-Host "❌ فشل في البناء: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}