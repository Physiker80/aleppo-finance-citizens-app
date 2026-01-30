# 🔒 التشفير في حالة السكون (Encryption at Rest)

يحمي هذا النظام البيانات المخزنة على الأقراص أو في قواعد البيانات من الوصول غير المصرح به في حال سرقة الوسائط أو اختراق النظام.

## الأهداف
- حماية الحقول الحساسة في قاعدة البيانات.
- حماية الملفات المرفوعة والتقارير.
- التكامل مع نظام إدارة المفاتيح (KMS) لدوران المفاتيح وتتبعها.

## المكوّنات الأساسية
- تشفير الحقول (AES-256-GCM + PBKDF2): `utils/databaseEncryption.ts`
- تشفير الملفات (AES-256-CBC + SHA-256 checksum): `utils/fileEncryption.ts`
- إدارة المفاتيح والتدوير: `utils/keyRotationManager.ts`

## تشفير قاعدة البيانات (حقول)
واجهة برمجية جاهزة للاستخدام:

```ts
import { encryptionService } from './services/encryptionService';

// قبل التخزين
const encNationalId = await encryptionService.encryptField(nationalId, MASTER_KEY);

// بعد القراءة
const nationalId = await encryptionService.decryptField(encNationalId, MASTER_KEY);
```

الخصائص:
- خوارزمية: `aes-256-gcm`
- اشتقاق المفتاح: `pbkdf2` (100,000 تكرار)
- تنسيق التخزين: Base64 لدمج `salt || iv || tag || ciphertext`

## تشفير الملفات المرفوعة
الاستخدام:

```ts
const { success, encryptedPath, checksum, metadata } = await encryptionService.encryptFile(file, userPassword, userId, ticketId);
// metadata تحتوي على: algorithm, keyLength, checksum, saltHex, kmsKeyId (إن توفر)

const dec = await encryptionService.decryptFile(encryptedPath, userPassword);
```

المزايا:
- تشفير تدفقي للملفات الكبيرة (AES-256-CBC)
- حفظ `saltHex` ضمن البيانات الوصفية لتمكين فك التشفير الصحيح
- تحقق سلامة عبر `SHA-256 checksum`
- تكامل اختياري مع KMS عبر `kmsKeyId` في metadata

## التكامل مع KMS ودوران المفاتيح
- يتم وسم الملفات المشفرة بـ `kmsKeyId` عند التشفير (إن توفر مفتاح `FILE_ENCRYPTION`).
- الخطوة التالية (مقترحة): تطبيق Envelope Encryption بحيث يتم توليد DEK لكل ملف، وتغليفه بمفتاح KMS (KEK) وتخزين `wrappedDEK` في metadata.

## توصيات أمنية
- تدوير مفاتيح التشفير الحساسة كل 90 يوماً.
- استخدام `AES-256` للملفات والبيانات عالية الحساسية.
- فصل مفاتيح البيئة الإنتاجية عن مفاتيح التطوير/الاختبار.
- تفعيل المصادقة متعددة العوامل لحسابات الإدارة.

## تحذيرات
- لا تحفظ مفاتيح خام داخل LocalStorage. يتم حفظ البيانات الوصفية فقط.
- تأكد من حماية `MASTER_KEY` في الخادم (أسرار البيئة/خزنة أسرار).

---

## التشفير المغلف (Envelope Encryption)

يوفّر النظام أسلوب التشفير المغلف بحيث يتم توليد مفتاح بيانات مؤقت (DEK) لكل ملف، وتشفير محتوى الملف به، ثم لفّ هذا المفتاح عبر مفتاح رئيسي (KEK) مُدار بواسطة KMS. يتم حفظ DEK الملفوف ضمن بيانات الملف الوصفية.

المزايا:
- تدوير مفتاح KEK دون إعادة تشفير الملفات (يكفي إعادة لفّ DEK عند الحاجة)
- تقليل تعريض المفاتيح الحساسة عبر الاعتماد على KMS للاحتفاظ بالمفاتيح الرئيسية

واجهات الخدمة (في `services/encryptionService.ts`):
- `encryptFileEnvelope(file: File | Blob, options?) => Promise<{ encryptedFile: File, metadata: FileMetadata }>`
- `decryptFileEnvelope(encrypted: File | Blob, metadata: FileMetadata) => Promise<File>`

حقول مهمة في `FileMetadata`:
- `wrappedDek` (Base64): مفتاح DEK بعد لفّه عبر KEK
- `kmsKeyId` (string): معرّف KEK المستخدم من KMS
- `dekAlgorithm` (string): خوارزمية DEK (مثل `AES-256-CBC`)
- `saltHex` (string): الملح المستخدم (إن وجد)
- `keyDerivation` (object): تفاصيل اشتقاق المفتاح (مثل PBKDF2 وعدد التكرارات والخوارزمية)

مثال تشفير:
```ts
import { encryptFileEnvelope } from './services/encryptionService';

async function upload(file: File) {
	const { encryptedFile, metadata } = await encryptFileEnvelope(file, {
		filename: file.name,
		mimeType: file.type,
	});
	await saveToStorage(encryptedFile);      // تخزين الملف المشفر
	await saveMetadataToDB(metadata);        // تخزين البيانات الوصفية
}
```

مثال فك التشفير:
```ts
import { decryptFileEnvelope } from './services/encryptionService';

async function download(metadataFromDB: FileMetadata) {
	const encryptedFile = await fetchEncryptedFromStorage(metadataFromDB.filename);
	const plainFile = await decryptFileEnvelope(encryptedFile, metadataFromDB);
	return plainFile;
}
```

ملاحظات:
- متوافق مع ويندوز: المسارات المؤقتة تستخدم `os.tmpdir()` مع `path.join(...)`.
- اختبار تكاملي: انظر `tests/envelopeEncryption.test.ts` للتحقق من نجاح التشفير/فك التشفير وتكامل KMS/metadata.
- يعتمد KMS على Web Crypto (ملائم للمتصفح)، وتُحفظ بيانات التعريف في LocalStorage بينما تبقى مادة المفاتيح الخام في الذاكرة فقط.
