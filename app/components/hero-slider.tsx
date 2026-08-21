"use client";

import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import {
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { SiteContent } from "../../modules/site-content/schema";

export function HeroSlider({
  slides,
  imageFit,
}: {
  slides: SiteContent["slides"];
  imageFit: SiteContent["slider"]["imageFit"];
}) {
  const autoplay = useMemo(
    () =>
      Autoplay({
        delay: 6500,
        stopOnFocusIn: true,
        stopOnInteraction: true,
        stopOnMouseEnter: true,
      }),
    [],
  );
  const [viewportRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start" },
    [autoplay],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const updateSelected = useCallback(() => {
    if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const onPlay = () => setIsPlaying(true);
    const onStop = () => setIsPlaying(false);
    const applyMotionPreference = () => {
      if (reduceMotion.matches) autoplay.stop();
    };

    emblaApi.on("select", updateSelected);
    emblaApi.on("reInit", updateSelected);
    emblaApi.on("autoplay:play", onPlay);
    emblaApi.on("autoplay:stop", onStop);
    reduceMotion.addEventListener("change", applyMotionPreference);
    applyMotionPreference();

    return () => {
      emblaApi.off("select", updateSelected);
      emblaApi.off("reInit", updateSelected);
      emblaApi.off("autoplay:play", onPlay);
      emblaApi.off("autoplay:stop", onStop);
      reduceMotion.removeEventListener("change", applyMotionPreference);
    };
  }, [autoplay, emblaApi, updateSelected]);

  function showPrevious() {
    autoplay.stop();
    emblaApi?.scrollPrev();
  }

  function showNext() {
    autoplay.stop();
    emblaApi?.scrollNext();
  }

  function showSlide(index: number) {
    autoplay.stop();
    emblaApi?.scrollTo(index);
  }

  function toggleAutoplay() {
    if (autoplay.isPlaying()) autoplay.stop();
    else autoplay.play();
  }

  return (
    <section
      className="hero-slider"
      aria-roledescription="karuzela"
      aria-label="Życie King’s Language Academy"
      data-testid="hero-slider"
    >
      <div className="hero-slider-viewport" ref={viewportRef}>
        <div className="hero-slider-track">
          {slides.map((slide, index) => (
            <article
              className="hero-slide"
              key={slide.id}
              role="group"
              aria-roledescription="slajd"
              aria-label={`${index + 1} z ${slides.length}`}
              aria-hidden={selectedIndex !== index}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={index === 0}
                loading={index === 0 ? "eager" : "lazy"}
                unoptimized={slide.src.startsWith("data:")}
                sizes="(max-width: 760px) 100vw, 55vw"
                style={{ objectPosition: slide.position, objectFit: imageFit }}
              />
              <div className="hero-slide-shade" />
              <div className="hero-slide-caption">
                <span>{slide.kicker}</span>
                <strong>{slide.title}</strong>
                <p>{slide.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="hero-slider-controls">
        <div className="hero-slider-arrows">
          <button
            type="button"
            onClick={showPrevious}
            aria-label="Poprzednie zdjęcie"
          >
            <ArrowLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={showNext}
            aria-label="Następne zdjęcie"
          >
            <ArrowRight aria-hidden="true" />
          </button>
        </div>

        <div className="hero-slider-dots" aria-label="Wybierz zdjęcie">
          {slides.map((slide, index) => (
            <button
              type="button"
              key={slide.id}
              onClick={() => showSlide(index)}
              aria-label={`Pokaż zdjęcie ${index + 1}`}
              aria-current={selectedIndex === index ? "true" : undefined}
            />
          ))}
        </div>

        <button
          className="hero-slider-play"
          type="button"
          onClick={toggleAutoplay}
          aria-label={isPlaying ? "Zatrzymaj pokaz zdjęć" : "Wznów pokaz zdjęć"}
        >
          {isPlaying ? (
            <Pause aria-hidden="true" />
          ) : (
            <Play aria-hidden="true" />
          )}
        </button>
      </div>
    </section>
  );
}
