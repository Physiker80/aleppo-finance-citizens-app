#!/bin/bash
# نص بناء الإنتاج مع التشفير أثناء النقل
# مديرية مالية حلب - نظام الاستعلامات والشكاوى

set -e  # إيقاف التنفيذ عند حدوث خطأ

echo "🚀 بدء عملية البناء للإنتاج..."

# 1. تنظيف البناء السابق
echo "🧹 تنظيف ملفات البناء السابق..."
rm -rf dist/
rm -rf build/
rm -rf node_modules/.cache/

# 2. تثبيت التبعيات
echo "📦 تثبيت التبعيات..."
npm ci --only=production

# 3. بناء التطبيق
echo "🔨 بناء التطبيق..."
npm run build

# 4. إنشاء مجلد الخادم
echo "📁 إعداد هيكل الخادم..."
mkdir -p dist/server/
mkdir -p dist/config/nginx/
mkdir -p dist/config/ssl/

# 5. نسخ ملفات الخادم
echo "📋 نسخ ملفات الخادم..."
cp -r src/server/* dist/server/ 2>/dev/null || echo "⚠️ لا توجد ملفات خادم للنسخ"
cp middleware/security.ts dist/server/ 2>/dev/null || echo "⚠️ لا يوجد ملف middleware للنسخ"

# 6. نسخ إعدادات Nginx
echo "🔧 نسخ إعدادات Nginx..."
cp config/nginx/* dist/config/nginx/ 2>/dev/null || echo "⚠️ لا توجد ملفات Nginx للنسخ"

# 7. إنشاء شهادات SSL للتطوير (إذا لم تكن موجودة)
if [ ! -f "config/ssl/localhost.crt" ]; then
    echo "🔐 إنشاء شهادات SSL للتطوير..."
    mkdir -p config/ssl/
    
    # إنشاء مفتاح خاص
    openssl genrsa -out config/ssl/localhost.key 2048
    
    # إنشاء طلب شهادة
    openssl req -new -key config/ssl/localhost.key -out config/ssl/localhost.csr -subj "/CN=localhost/O=Syrian Finance Ministry/C=SY"
    
    # إنشاء شهادة موقعة ذاتياً
    openssl x509 -req -days 365 -in config/ssl/localhost.csr -signkey config/ssl/localhost.key -out config/ssl/localhost.crt
    
    echo "✅ تم إنشاء شهادات SSL للتطوير"
else
    echo "✅ شهادات SSL موجودة مسبقاً"
fi

# 8. نسخ شهادات SSL
cp config/ssl/* dist/config/ssl/ 2>/dev/null || echo "⚠️ لا توجد شهادات SSL للنسخ"

# 9. إنشاء package.json للإنتاج
echo "📝 إنشاء package.json للإنتاج..."
cat > dist/package.json << EOF
{
  "name": "aleppo-finance-system-production",
  "version": "1.0.0",
  "description": "نظام الاستعلامات والشكاوى - مديرية مالية حلب",
  "main": "server/app.js",
  "type": "module",
  "scripts": {
    "start": "node server/app.js",
    "start:https": "NODE_ENV=production node server/app.js",
    "health": "curl -f http://localhost:3000/api/health || exit 1"
  },
  "dependencies": {
    "express": "^4.19.2",
    "helmet": "^8.1.0",
    "cors": "^2.8.5",
    "compression": "^1.7.4",
    "express-rate-limit": "^8.1.0"
  }
}
EOF

# 10. إنشاء Dockerfile للإنتاج
echo "🐳 إنشاء Dockerfile..."
cat > Dockerfile << 'EOF'
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
EOF

# 11. إنشاء .dockerignore
echo "📋 إنشاء .dockerignore..."
cat > .dockerignore << 'EOF'
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
EOF

# 12. تحديد الأذونات
echo "🔐 تعيين الأذونات الآمنة..."
chmod 600 config/ssl/*.key 2>/dev/null || true
chmod 644 config/ssl/*.crt 2>/dev/null || true
chmod 755 scripts/*.sh 2>/dev/null || true

# 13. إنشاء معلومات البناء
echo "📊 إنشاء معلومات البناء..."
cat > dist/build-info.json << EOF
{
  "buildTime": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")",
  "buildHost": "$(hostname)",
  "gitCommit": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
  "gitBranch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
  "nodeVersion": "$(node --version)",
  "npmVersion": "$(npm --version)",
  "environment": "production",
  "features": {
    "https": true,
    "securityHeaders": true,
    "rateLimit": true,
    "compression": true,
    "staticServing": true
  }
}
EOF

echo "✅ تم البناء بنجاح!"
echo ""
echo "📁 الملفات المبنية في: dist/"
echo "🔧 لتشغيل الخادم: cd dist && npm start"
echo "🔐 للتشغيل مع HTTPS: cd dist && npm run start:https"
echo "🐳 لبناء Docker image: docker build -t aleppo-finance-system ."
echo ""
echo "📋 معلومات البناء:"
cat dist/build-info.json | grep -E '(buildTime|gitCommit|environment)'