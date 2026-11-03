export const CART_CHANGED_EVENT = "locphat-cart-changed";
export const CART_ITEM_ADDED_EVENT = "locphat-cart-item-added";
const CART_STORAGE_KEY = "locphat-cart";

export function getCart() {
  if (typeof window === "undefined") return [];

  const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!savedCart) return [];

  try {
    const parsedCart = JSON.parse(savedCart);
    return Array.isArray(parsedCart)
      ? parsedCart.filter((item) => item && item.id && Number.isInteger(item.quantity) && item.quantity > 0)
      : [];
  } catch (error) {
    if (error instanceof SyntaxError) return [];
    throw error;
  }
}

export function saveCart(cart) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}

export function addToCart(product, quantity = 1) {
  if (!product?.id || !Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Sản phẩm hoặc số lượng không hợp lệ.");
  }

  const cart = getCart();
  const existingItem = cart.find((item) => String(item.id) === String(product.id));
  const item = {
    id: product.id,
    name: product.name,
    image: product.image || "",
    price: Number(product.sale_price || product.price || 0),
    quantity,
  };

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push(item);
  }

  saveCart(cart);
  window.dispatchEvent(new CustomEvent(CART_ITEM_ADDED_EVENT, {
    detail: { productName: product.name },
  }));
}

export function updateCartQuantity(productId, quantity) {
  const cart = getCart()
    .map((item) => String(item.id) === String(productId) ? { ...item, quantity } : item)
    .filter((item) => item.quantity > 0);
  saveCart(cart);
}

export function removeFromCart(productId) {
  saveCart(getCart().filter((item) => String(item.id) !== String(productId)));
}
