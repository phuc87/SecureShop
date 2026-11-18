package com.secureshop;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class SecureShopApplication {

    public static void main(String[] args) {
        SpringApplication.run(SecureShopApplication.class, args);
    }
}
