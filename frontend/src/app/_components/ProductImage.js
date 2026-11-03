"use client";

import Image from "next/image";
import { useState } from "react";
import { productImageFallbackFor, productImageFor } from "@/lib/productImageUrl";

const genericProductImage = "/product-images/smartphone.svg";

export default function ProductImage({ product, src, fallbackSrc, alt = "", ...imageProps }) {
  const imageSource = src || productImageFor(product);
  const fallbackSource = fallbackSrc || productImageFallbackFor(product) || genericProductImage;
  const [failedSource, setFailedSource] = useState(null);
  const hasFailed = failedSource === imageSource;

  return (
    <Image
      {...imageProps}
      src={hasFailed ? fallbackSource : imageSource}
      alt={alt}
      onError={() => {
        if (imageSource !== fallbackSource) setFailedSource(imageSource);
      }}
    />
  );
}
