package com.secureshop.repository;

import com.secureshop.entity.Address;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AddressRepository extends JpaRepository<Address, Long> {

    Optional<Address> findFirstByUserIdAndDefaultAddressTrueOrderByIdDesc(Long userId);

    Optional<Address> findFirstByUserIdOrderByIdDesc(Long userId);
}
