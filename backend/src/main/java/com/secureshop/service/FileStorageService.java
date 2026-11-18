package com.secureshop.service;

import com.secureshop.entity.enums.MessageType;
import com.secureshop.exception.ApiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Lưu file chat vào thư mục uploads/chat trên ổ đĩa, phục vụ lại qua /api/files/chat/...
 * An toàn:
 *  - Chỉ nhận các định dạng trong danh sách cho phép.
 *  - Tên file trên đĩa là UUID ngẫu nhiên + đuôi do server quyết định (không dùng tên khách gửi),
 *    nên không thể ghi đè file khác hay tải lên file .html/.js để chạy mã.
 */
@Slf4j
@Service
public class FileStorageService {

    /** MIME type cho phép -> đuôi file lưu trên đĩa. */
    private static final Map<String, String> ALLOWED = Map.ofEntries(
            Map.entry("image/jpeg", ".jpg"), Map.entry("image/png", ".png"),
            Map.entry("image/gif", ".gif"), Map.entry("image/webp", ".webp"),
            Map.entry("audio/webm", ".webm"), Map.entry("audio/ogg", ".ogg"), Map.entry("audio/mpeg", ".mp3"),
            Map.entry("audio/mp4", ".m4a"), Map.entry("audio/x-m4a", ".m4a"), Map.entry("audio/wav", ".wav"),
            Map.entry("audio/x-wav", ".wav"), Map.entry("audio/aac", ".aac"),
            Map.entry("video/mp4", ".mp4"), Map.entry("video/webm", ".webm"), Map.entry("video/quicktime", ".mov"),
            Map.entry("application/pdf", ".pdf"),
            Map.entry("application/msword", ".doc"),
            Map.entry("application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"),
            Map.entry("application/vnd.ms-excel", ".xls"),
            Map.entry("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"),
            Map.entry("text/plain", ".txt"));

    public record StoredFile(String url, String fileName, long size, String mimeType, MessageType type) {
    }

    /** Ảnh sản phẩm: chỉ nhận ảnh, tối đa 5MB. */
    private static final Map<String, String> IMAGE_TYPES = Map.of(
            "image/jpeg", ".jpg", "image/png", ".png", "image/webp", ".webp", "image/gif", ".gif");
    private static final long MAX_PRODUCT_IMAGE_BYTES = 5L * 1024 * 1024;

    private final Path chatDir;
    private final Path productDir;
    private final long maxBytes;

    public FileStorageService(@Value("${app.upload.dir}") String uploadDir,
                              @Value("${app.upload.max-size-mb}") long maxSizeMb) throws IOException {
        Path root = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.chatDir = root.resolve("chat");
        this.productDir = root.resolve("products");
        this.maxBytes = maxSizeMb * 1024 * 1024;
        Files.createDirectories(chatDir);
        Files.createDirectories(productDir);
        log.info("Thư mục lưu file upload: {}", root);
    }

    /** Lưu ảnh sản phẩm -> trả về đường dẫn /api/files/products/<ngẫu nhiên>.jpg */
    public String storeProductImage(MultipartFile file) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("File rỗng");
        if (file.getSize() > MAX_PRODUCT_IMAGE_BYTES) throw ApiException.badRequest("Ảnh sản phẩm tối đa 5MB");
        String mime = normalizeMime(file.getContentType());
        String ext = IMAGE_TYPES.get(mime);
        if (ext == null) throw ApiException.badRequest("Ảnh sản phẩm chỉ nhận JPG, PNG, WEBP, GIF");
        String storedName = UUID.randomUUID().toString().replace("-", "") + ext;
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, productDir.resolve(storedName), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Không lưu được ảnh", e);
        }
        return "/api/files/products/" + storedName;
    }

    public StoredFile storeChatFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("File rỗng");
        }
        if (file.getSize() > maxBytes) {
            throw ApiException.badRequest("File vượt quá " + (maxBytes / 1024 / 1024) + "MB");
        }
        String mime = normalizeMime(file.getContentType());
        String ext = ALLOWED.get(mime);
        if (ext == null) {
            throw ApiException.badRequest("Định dạng file không được hỗ trợ (" + mime + "). "
                    + "Chỉ nhận ảnh, âm thanh, video, PDF, Word, Excel, TXT.");
        }
        String storedName = UUID.randomUUID().toString().replace("-", "") + ext;
        Path target = chatDir.resolve(storedName);
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Không lưu được file", e);
        }
        return new StoredFile("/api/files/chat/" + storedName, safeOriginalName(file.getOriginalFilename(), ext),
                file.getSize(), mime, typeOf(mime));
    }

    /** "audio/webm;codecs=opus" -> "audio/webm" */
    private static String normalizeMime(String contentType) {
        if (contentType == null) return "application/octet-stream";
        return contentType.split(";")[0].trim().toLowerCase(Locale.ROOT);
    }

    private static MessageType typeOf(String mime) {
        if (mime.startsWith("image/")) return MessageType.IMAGE;
        if (mime.startsWith("audio/")) return MessageType.AUDIO;
        if (mime.startsWith("video/")) return MessageType.VIDEO;
        return MessageType.FILE;
    }

    /** Chỉ giữ tên file (bỏ đường dẫn), tối đa 200 ký tự, dùng để hiển thị. */
    private static String safeOriginalName(String original, String ext) {
        if (original == null || original.isBlank()) return "tep-dinh-kem" + ext;
        String name = original.replace("\\", "/");
        name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\r\\n\"]", "");
        return name.length() > 200 ? name.substring(0, 200) : name;
    }
}
