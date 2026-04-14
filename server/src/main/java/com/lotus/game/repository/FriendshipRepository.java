package com.lotus.game.repository;

import com.lotus.game.entity.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    List<Friendship> findByStatusAndAddresseeIdOrderByCreatedAtDesc(Friendship.FriendshipStatus status, Long addresseeId);

    List<Friendship> findByStatusAndRequesterIdOrderByCreatedAtDesc(Friendship.FriendshipStatus status, Long requesterId);

    Optional<Friendship> findByIdAndAddresseeIdAndStatus(Long id, Long addresseeId, Friendship.FriendshipStatus status);

    @Query("""
            select f from Friendship f
            where ((f.requesterId = :a and f.addresseeId = :b) or (f.requesterId = :b and f.addresseeId = :a))
            order by f.createdAt desc
            """)
    List<Friendship> findAllBetweenUsers(@Param("a") Long a, @Param("b") Long b);

    @Query("""
            select f from Friendship f
            where f.status = :status and (f.requesterId = :userId or f.addresseeId = :userId)
            order by f.createdAt desc
            """)
    List<Friendship> findAllByStatusAndUser(@Param("status") Friendship.FriendshipStatus status,
                                            @Param("userId") Long userId);
}
