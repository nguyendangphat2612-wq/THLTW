export function productImageUrl(image) {
  if (typeof image !== "string" || image.trim() === "") return "";

  const source = image.trim();
  if (/^(https?:|data:|blob:)/i.test(source) || source.startsWith("/")) return source;

  return `/storage/${source.replace(/^storage\//i, "").replace(/^\/+/, "")}`;
}

const productImageByModel = [
  [["iphone-15", "iphone 15"], "iphone-15.jpg"],
  [["galaxy-s24", "galaxy s24"], "galaxy-s24.jpg"],
  [["redmi-note-13-pro", "redmi note 13 pro"], "xiaomi-redmi-note-13-pro.svg"],
  [["reno-11", "reno 11"], "oppo-reno-11-5g.svg"],
  [["vivo-v30", "vivo v30"], "vivo-v30-5g.svg"],
  [["realme-12-pro", "realme 12 pro"], "realme-12-pro-plus.svg"],
  [["nokia-c32", "nokia c32"], "nokia-c32.svg"],
  [["rog-phone-8-pro", "rog phone 8 pro"], "rog-phone-8-pro.jpg"],
  [["rog-phone-8", "rog phone 8"], "rog-phone-8.jpg"],
  [["rog-phone-9", "rog phone 9"], "rog-phone-9.jpg"],
];

export function productImageFallbackFor(product) {
  const identifiers = [
    product?.alias,
    product?.name,
    product?.product_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const image = productImageByModel.find(([aliases]) =>
    aliases.some((alias) => identifiers.includes(alias)),
  );

  return `/product-images/${image?.[1] || "smartphone.svg"}`;
}

export function productImageFor(product) {
  return productImageUrl(product?.image) || productImageFallbackFor(product);
}