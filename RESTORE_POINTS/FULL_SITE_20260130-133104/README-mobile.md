# دليل تطبيقات الموبايل - مديرية مالية حلب

## 📱 نظرة عامة

تم تهيئة المشروع لدعم منصتي **Android** و **iOS** باستخدام Capacitor.

## 📁 هيكل المجلدات

```
├── android/          # مشروع Android الأصلي
│   ├── app/         # التطبيق الرئيسي
│   └── gradle/      # إعدادات Gradle
│
├── ios/              # مشروع iOS الأصلي
│   ├── App/         # التطبيق الرئيسي
│   └── Podfile      # إعدادات CocoaPods
│
└── dist/             # ملفات الويب المبنية
```

## 🚀 الأوامر المتاحة

### بناء عام
```bash
npm run build              # بناء ملفات الويب
npm run mobile:build       # بناء + مزامنة لجميع المنصات
npm run cap:sync           # مزامنة جميع المنصات
```

### Android
```bash
npm run cap:add:android    # إضافة منصة Android (مرة واحدة)
npm run cap:sync:android   # مزامنة Android فقط
npm run android:open       # فتح في Android Studio
npm run android:run        # تشغيل على جهاز/محاكي
npm run android:dev        # بناء + مزامنة + تشغيل
npm run android:dev:url    # تشغيل مع Dev Server
```

### iOS
```bash
npm run cap:add:ios        # إضافة منصة iOS (مرة واحدة)
npm run cap:sync:ios       # مزامنة iOS فقط
npm run ios:open           # فتح في Xcode
npm run ios:run            # تشغيل على جهاز/محاكي
npm run ios:dev            # بناء + مزامنة + تشغيل
npm run ios:dev:url        # تشغيل مع Dev Server
```

## 📋 المتطلبات

### Android
- **Android Studio** Arctic Fox أو أحدث
- **JDK 17** أو أحدث
- **Android SDK** مع API Level 22+

### iOS (يتطلب macOS)
- **Xcode 15** أو أحدث
- **CocoaPods** (`sudo gem install cocoapods`)
- **macOS Ventura** أو أحدث

## ⚙️ إعداد التطوير

### 1. البناء الأولي
```bash
npm run build
npm run cap:sync
```

### 2. التطوير مع Live Reload

**الطريقة 1: استخدام Dev Server**
```bash
# في terminal منفصل
npm run dev -- --port 5175 --host

# ثم في terminal آخر
npm run android:dev:url   # أو ios:dev:url
```

**الطريقة 2: External Mode**
```bash
npm run android:dev:external   # أو ios:dev:external
```

## 🔧 إعدادات التطبيق

| الإعداد | القيمة |
|---------|--------|
| App ID | `com.aleppo.finance.system` |
| App Name | `مديرية مالية حلب` |
| Web Dir | `dist` |
| Min Android API | 22 |
| Min iOS Version | 13.0 |

## 📲 بناء للإنتاج

### Android APK
```bash
npm run build
npm run cap:sync:android
npm run gradle:assembleRelease
```
الملف: `android/app/build/outputs/apk/release/app-release.apk`

### Android Bundle (Google Play)
```bash
npm run build
npm run cap:sync:android
npm run gradle:bundleRelease
```
الملف: `android/app/build/outputs/bundle/release/app-release.aab`

### iOS (على macOS)
```bash
npm run build
npm run cap:sync:ios
npm run ios:open
# ثم Build Archive من Xcode
```

## 🎨 الأيقونات والـ Splash Screen

### Android
- الموقع: `android/app/src/main/res/`
- المجلدات: `mipmap-*` للأيقونات، `drawable` للـ Splash

### iOS
- الموقع: `ios/App/App/Assets.xcassets/`
- `AppIcon.appiconset/` للأيقونات
- `Splash.imageset/` للـ Splash Screen

## 🔐 ملاحظات الأمان

- يتم تفعيل HTTPS scheme للـ Android في الإنتاج
- Mixed content مفعل للتطوير فقط
- WebView debugging معطل في الإنتاج

## 📚 مراجع

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [iOS Developer Guide](https://developer.apple.com/documentation/)
 هام - احتفظ بهذه المعلومات:
المفتاح	القيمة
Keystore File	aleppo-finance.keystore
Store Password	AleppoFinance2026
Key Alias	aleppo-finance
Key Password	AleppoFinance2026
تحذير: احتفظ بملف keystore وكلمات المرور في مكان آمن! ستحتاجها لتحديث التطبيق على Google Play.