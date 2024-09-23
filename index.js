const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process'); // DJVU konvertatsiyasi uchun ishlatiladi
const fs = require('fs');
const path = require('path');

// Bot tokenini kiriting
const token = '8148263174:AAE5TEYbZBA0_O3Sa8ALuwyAI-9L-xySDJk';

// Botni yaratamiz
const bot = new TelegramBot(token, { polling: true });

// Foydalanuvchi DJVU faylni yuborganida ishlovchi handler
bot.on('document', async (msg) => {
    const chatId = msg.chat.id;
    const document = msg.document;

    // Fayl turi DJVU ekanligini tekshirish
    if (document.mime_type === 'image/vnd.djvu') {
        // Foydalanuvchiga fayl qabul qilinganini bildirish
        bot.sendMessage(chatId, 'Fayl qabul qilindi. PDF formatiga aylantirilmoqda...');

        // Faylni yuklab olish uchun URL
        const fileId = document.file_id;
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

        // Faylni vaqtinchalik papkaga saqlash
        const downloadPath = path.join(__dirname, `${document.file_name}`);
        const outputPdfPath = downloadPath.replace('.djvu', '.pdf');

        // Faylni yuklash va serverga saqlash
        const download = (url, path, callback) => {
            const https = require('https');
            const file = fs.createWriteStream(path);
            https.get(url, function(response) {
                response.pipe(file);
                file.on('finish', function() {
                    file.close(callback);
                });
            });
        };

        download(fileUrl, downloadPath, () => {
            // DJVU faylini PDF formatiga o'zgartirish (tizimdagi djvu2pdf yoki djvulibre vositasi orqali)
            exec(`djvu2pdf ${downloadPath} ${outputPdfPath}`, (err, stdout, stderr) => {
                if (err) {
                    bot.sendMessage(chatId, 'Faylni PDF ga o‘tkazishda xatolik yuz berdi.');
                    console.error(`Xato: ${err}`);
                    return;
                }

                // PDF faylni foydalanuvchiga yuborish
                bot.sendDocument(chatId, outputPdfPath).then(() => {
                    // Fayllarni o'chirish
                    fs.unlinkSync(downloadPath);
                    fs.unlinkSync(outputPdfPath);
                });
            });
        });
    } else {
        bot.sendMessage(chatId, 'Iltimos, faqat DJVU formatdagi fayllarni yuboring.');
    }
});
