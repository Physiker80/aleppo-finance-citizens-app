#!/bin/bash

# =================================================================
# سكريبت إعداد شهادات SSL/TLS لنظام وزارة المالية السورية
# نظام الاستعلامات والشكاوى - مديرية مالية حلب
# =================================================================

set -euo pipefail

# الألوان للمخرجات
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# المتغيرات الأساسية
DOMAIN="finance.gov.sy"
SSL_DIR="/etc/nginx/ssl"
CERT_DIR="/etc/letsencrypt/live"
EMAIL="admin@finance.gov.sy"
COUNTRY="SY"
STATE="Aleppo"
CITY="Aleppo"
ORG="Syrian Ministry of Finance"
OU="Aleppo Finance Directorate"

# دالة الطباعة الملونة
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# دالة التحقق من المتطلبات
check_requirements() {
    print_status "التحقق من المتطلبات الأساسية..."
    
    # التحقق من صلاحيات الجذر
    if [[ $EUID -ne 0 ]]; then
        print_error "هذا السكريبت يحتاج صلاحيات الجذر (root). استخدم sudo."
        exit 1
    fi
    
    # التحقق من وجود الأدوات المطلوبة
    local tools=("openssl" "nginx" "certbot")
    for tool in "${tools[@]}"; do
        if ! command -v $tool &> /dev/null; then
            print_warning "$tool غير مثبت. سيتم تثبيته..."
            case $tool in
                "openssl")
                    apt-get update && apt-get install -y openssl
                    ;;
                "nginx")
                    apt-get install -y nginx
                    ;;
                "certbot")
                    apt-get install -y certbot python3-certbot-nginx
                    ;;
            esac
        fi
    done
    
    print_success "جميع المتطلبات متوفرة"
}

# دالة إنشاء مجلد SSL
create_ssl_directory() {
    print_status "إنشاء مجلد SSL..."
    
    mkdir -p $SSL_DIR
    chmod 700 $SSL_DIR
    
    print_success "تم إنشاء مجلد SSL: $SSL_DIR"
}

# دالة توليد معاملات Diffie-Hellman القوية
generate_dhparam() {
    print_status "توليد معاملات Diffie-Hellman (4096-bit)..."
    print_warning "هذه العملية قد تستغرق عدة دقائق..."
    
    if [[ ! -f "$SSL_DIR/dhparam.pem" ]]; then
        openssl dhparam -out $SSL_DIR/dhparam.pem 4096
        chmod 600 $SSL_DIR/dhparam.pem
        print_success "تم توليد معاملات Diffie-Hellman"
    else
        print_warning "معاملات Diffie-Hellman موجودة مسبقاً"
    fi
}

# دالة توليد شهادة ذاتية التوقيع للتطوير
generate_self_signed_cert() {
    print_status "توليد شهادة SSL ذاتية التوقيع للتطوير..."
    
    # إنشاء ملف التكوين للشهادة
    cat > $SSL_DIR/cert.conf <<EOF
[req]
default_bits = 4096
prompt = no
distinguished_name = req_distinguished_name
req_extensions = v3_req

[req_distinguished_name]
C=$COUNTRY
ST=$STATE
L=$CITY
O=$ORG
OU=$OU
CN=$DOMAIN

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = $DOMAIN
DNS.2 = www.$DOMAIN
DNS.3 = localhost
IP.1 = 127.0.0.1
EOF

    # توليد المفتاح الخاص والشهادة
    openssl req -x509 -nodes -days 365 \
        -newkey rsa:4096 \
        -keyout $SSL_DIR/finance.gov.sy.key \
        -out $SSL_DIR/finance.gov.sy.crt \
        -config $SSL_DIR/cert.conf \
        -extensions v3_req

    # توليد شهادة وسيطة وهمية
    cp $SSL_DIR/finance.gov.sy.crt $SSL_DIR/intermediate.crt
    cp $SSL_DIR/finance.gov.sy.crt $SSL_DIR/chain.pem

    # تعيين صلاحيات آمنة
    chmod 600 $SSL_DIR/finance.gov.sy.key
    chmod 644 $SSL_DIR/finance.gov.sy.crt
    chmod 644 $SSL_DIR/intermediate.crt
    chmod 644 $SSL_DIR/chain.pem

    print_success "تم توليد شهادة SSL ذاتية التوقيع"
    print_warning "هذه شهادة للتطوير فقط! استخدم Let's Encrypt للإنتاج"
}

# دالة الحصول على شهادة Let's Encrypt
get_letsencrypt_cert() {
    print_status "الحصول على شهادة Let's Encrypt..."
    
    # التأكد من أن Nginx يعمل
    systemctl start nginx || true
    
    # الحصول على الشهادة
    certbot certonly --nginx \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --domains $DOMAIN,www.$DOMAIN \
        --non-interactive

    if [[ $? -eq 0 ]]; then
        # ربط الشهادات إلى مجلد Nginx
        ln -sf $CERT_DIR/$DOMAIN/fullchain.pem $SSL_DIR/finance.gov.sy.crt
        ln -sf $CERT_DIR/$DOMAIN/privkey.pem $SSL_DIR/finance.gov.sy.key
        ln -sf $CERT_DIR/$DOMAIN/chain.pem $SSL_DIR/intermediate.crt
        ln -sf $CERT_DIR/$DOMAIN/fullchain.pem $SSL_DIR/chain.pem
        
        print_success "تم الحصول على شهادة Let's Encrypt"
        
        # إعداد التجديد التلقائي
        setup_auto_renewal
    else
        print_error "فشل في الحصول على شهادة Let's Encrypt"
        print_status "سيتم استخدام شهادة ذاتية التوقيع بدلاً من ذلك"
        generate_self_signed_cert
    fi
}

# دالة إعداد التجديد التلقائي لشهادات Let's Encrypt
setup_auto_renewal() {
    print_status "إعداد التجديد التلقائي للشهادات..."
    
    # إنشاء cron job للتجديد التلقائي
    cat > /etc/cron.d/certbot-renew <<EOF
# تجديد تلقائي لشهادات Let's Encrypt كل 12 ساعة
0 */12 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
EOF

    # إنشاء سكريبت ما بعد التجديد
    cat > /etc/letsencrypt/renewal-hooks/post/nginx-reload.sh <<'EOF'
#!/bin/bash
# إعادة تحميل Nginx بعد تجديد الشهادات
systemctl reload nginx

# إرسال إشعار للسجلات
logger "تم تجديد شهادات SSL لنظام وزارة المالية"

# إرسال إشعار للمشرفين (اختياري)
# echo "تم تجديد شهادات SSL بنجاح" | mail -s "SSL Certificate Renewed" admin@finance.gov.sy
EOF

    chmod +x /etc/letsencrypt/renewal-hooks/post/nginx-reload.sh
    
    print_success "تم إعداد التجديد التلقائي"
}

# دالة تكوين أمان إضافي
configure_additional_security() {
    print_status "تكوين إعدادات الأمان الإضافية..."
    
    # إنشاء ملف تكوين أمان إضافي
    cat > $SSL_DIR/ssl-security.conf <<'EOF'
# إعدادات أمان SSL إضافية
# تستخدم في ملفات تكوين Nginx

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 1.1.1.1 1.0.0.1 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# إعدادات جلسة SSL محسنة
ssl_session_timeout 1d;
ssl_session_cache shared:MozTLS:10m;
ssl_session_tickets off;

# حماية من هجمات الطبقة السفلى
ssl_buffer_size 8k;

# تسجيل أحداث SSL
error_log /var/log/nginx/ssl-error.log info;
EOF

    # إنشاء سكريبت مراقبة الشهادات
    cat > $SSL_DIR/check-certificates.sh <<'EOF'
#!/bin/bash
# سكريبت مراقبة صحة وانتهاء صلاحية الشهادات

DOMAIN="finance.gov.sy"
CERT_FILE="/etc/nginx/ssl/finance.gov.sy.crt"
WARNING_DAYS=30

# التحقق من وجود الشهادة
if [[ ! -f "$CERT_FILE" ]]; then
    echo "ERROR: Certificate file not found: $CERT_FILE"
    exit 1
fi

# التحقق من انتهاء صلاحية الشهادة
EXPIRY_DATE=$(openssl x509 -in $CERT_FILE -noout -enddate | cut -d= -f2)
EXPIRY_TIMESTAMP=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_TIMESTAMP=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))

echo "Certificate for $DOMAIN expires in $DAYS_UNTIL_EXPIRY days"

if [[ $DAYS_UNTIL_EXPIRY -lt $WARNING_DAYS ]]; then
    echo "WARNING: Certificate expires soon!"
    # يمكن إضافة إرسال تنبيه هنا
fi

# التحقق من صحة الشهادة
if openssl x509 -in $CERT_FILE -noout -checkend 0; then
    echo "Certificate is valid"
else
    echo "ERROR: Certificate is invalid or expired"
    exit 1
fi
EOF

    chmod +x $SSL_DIR/check-certificates.sh
    
    # إضافة cron job لمراقبة الشهادات يومياً
    cat > /etc/cron.d/ssl-monitoring <<EOF
# مراقبة يومية لشهادات SSL
0 9 * * * root $SSL_DIR/check-certificates.sh >> /var/log/ssl-monitoring.log 2>&1
EOF

    print_success "تم تكوين إعدادات الأمان الإضافية"
}

# دالة اختبار التكوين
test_ssl_configuration() {
    print_status "اختبار تكوين SSL..."
    
    # اختبار صحة تكوين Nginx
    nginx -t
    if [[ $? -eq 0 ]]; then
        print_success "تكوين Nginx صحيح"
    else
        print_error "خطأ في تكوين Nginx"
        exit 1
    fi
    
    # اختبار الشهادات
    if openssl x509 -in $SSL_DIR/finance.gov.sy.crt -noout -text > /dev/null 2>&1; then
        print_success "شهادة SSL صحيحة"
        
        # عرض معلومات الشهادة
        echo -e "\n${BLUE}معلومات الشهادة:${NC}"
        openssl x509 -in $SSL_DIR/finance.gov.sy.crt -noout -subject -issuer -dates
    else
        print_error "شهادة SSL غير صحيحة"
        exit 1
    fi
    
    # اختبار قوة معاملات DH
    if [[ -f "$SSL_DIR/dhparam.pem" ]]; then
        DH_SIZE=$(openssl dhparam -in $SSL_DIR/dhparam.pem -text -noout | grep "bit" | awk '{print $1}')
        print_success "معاملات Diffie-Hellman: $DH_SIZE bit"
    fi
}

# دالة إعادة تشغيل الخدمات
restart_services() {
    print_status "إعادة تشغيل الخدمات..."
    
    systemctl reload nginx
    if [[ $? -eq 0 ]]; then
        print_success "تم إعادة تحميل Nginx بنجاح"
    else
        print_error "فشل في إعادة تحميل Nginx"
        exit 1
    fi
    
    # التحقق من حالة الخدمة
    if systemctl is-active --quiet nginx; then
        print_success "Nginx يعمل بشكل صحيح"
    else
        print_error "Nginx لا يعمل"
        systemctl status nginx
        exit 1
    fi
}

# دالة عرض تقرير الأمان
show_security_report() {
    echo -e "\n${GREEN}=== تقرير الأمان ===IONAL_SECURITY${NC}"
    echo -e "${BLUE}Domain:${NC} $DOMAIN"
    echo -e "${BLUE}SSL Directory:${NC} $SSL_DIR"
    echo -e "${BLUE}Certificate:${NC} $SSL_DIR/finance.gov.sy.crt"
    echo -e "${BLUE}Private Key:${NC} $SSL_DIR/finance.gov.sy.key"
    echo -e "${BLUE}DH Parameters:${NC} $SSL_DIR/dhparam.pem"
    
    echo -e "\n${BLUE}اختبر الأمان على:${NC}"
    echo -e "https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
    echo -e "https://observatory.mozilla.org/analyze/$DOMAIN"
    
    echo -e "\n${BLUE}الأوامر المفيدة:${NC}"
    echo -e "- فحص الشهادة: openssl x509 -in $SSL_DIR/finance.gov.sy.crt -text -noout"
    echo -e "- اختبار الاتصال: openssl s_client -connect $DOMAIN:443 -servername $DOMAIN"
    echo -e "- مراقبة السجلات: tail -f /var/log/nginx/finance_access.log"
    echo -e "- فحص التكوين: nginx -t"
}

# الدالة الرئيسية
main() {
    echo -e "${GREEN}"
    echo "=============================================================="
    echo "       إعداد شهادات SSL/TLS لوزارة المالية السورية       "
    echo "           نظام الاستعلامات والشكاوى - حلب               "
    echo "=============================================================="
    echo -e "${NC}"
    
    # تشغيل الوظائف بالترتيب
    check_requirements
    create_ssl_directory
    generate_dhparam
    
    # سؤال المستخدم عن نوع الشهادة
    echo -e "\n${YELLOW}اختر نوع الشهادة:${NC}"
    echo "1) Let's Encrypt (للإنتاج - يحتاج domain صحيح)"
    echo "2) Self-Signed (للتطوير والاختبار)"
    read -p "اختر (1 أو 2): " cert_choice
    
    case $cert_choice in
        1)
            get_letsencrypt_cert
            ;;
        2)
            generate_self_signed_cert
            ;;
        *)
            print_warning "اختيار غير صحيح، سيتم استخدام شهادة ذاتية التوقيع"
            generate_self_signed_cert
            ;;
    esac
    
    configure_additional_security
    test_ssl_configuration
    restart_services
    show_security_report
    
    echo -e "\n${GREEN}تم إعداد SSL/TLS بنجاح! 🔒${NC}"
    echo -e "${YELLOW}تأكد من تحديث DNS للإشارة إلى الخادم الجديد${NC}"
}

# تشغيل البرنامج الرئيسي
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi