package com.lotus.game.service;

import com.lotus.game.entity.HeroPortrait;
import com.lotus.game.repository.HeroPortraitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class HeroPortraitService {

    private final HeroPortraitRepository heroPortraitRepository;

    /** Публичный URL портрета из БД или пустая строка */
    public String resolvePortraitUrl(String heroId) {
        if (heroId == null || heroId.isBlank()) {
            return "";
        }
        return heroPortraitRepository.findById(heroId.trim())
                .map(HeroPortrait::getImageUrl)
                .filter(s -> s != null && !s.isBlank())
                .orElse("");
    }

    public Optional<String> findStoredUrl(String heroId) {
        if (heroId == null || heroId.isBlank()) {
            return Optional.empty();
        }
        return heroPortraitRepository.findById(heroId.trim()).map(HeroPortrait::getImageUrl);
    }

    @Transactional
    public void savePortraitUrl(String heroId, String imageUrl) {
        String id = heroId.trim();
        HeroPortrait hp = heroPortraitRepository.findById(id).orElseGet(() -> {
            HeroPortrait n = new HeroPortrait();
            n.setHeroId(id);
            return n;
        });
        hp.setImageUrl(imageUrl);
        heroPortraitRepository.save(hp);
    }

    @Transactional
    public void deleteByHeroId(String heroId) {
        if (heroId == null || heroId.isBlank()) {
            return;
        }
        heroPortraitRepository.deleteById(heroId.trim());
    }
}
