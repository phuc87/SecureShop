package com.secureshop.entity.enums;

public enum MessageType {
    TEXT,          // văn bản + emoji
    PRODUCT_CARD,  // thẻ sản phẩm (gửi thông tin thiết bị)
    IMAGE,
    AUDIO,         // ghi âm hoặc file âm thanh
    VIDEO,
    FILE,          // pdf, word, excel...
    CALL_LOG;      // nhật ký cuộc gọi video

    public boolean isMedia() {
        return this == IMAGE || this == AUDIO || this == VIDEO || this == FILE;
    }
}
