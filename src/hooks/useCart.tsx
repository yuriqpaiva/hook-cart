import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productResponse = await api.get(`/products/${productId}`);
      const product: Product = productResponse.data;

      const stockResponse = await api.get("/stock");
      const stock: Stock[] = stockResponse.data;

      const productAmount = stock.reduce((acc, stock) => {
        if (stock.id === productId) {
          acc = stock.amount;
          return acc;
        }

        return acc;
      }, 0);

      const index = cart.map((product) => product.id).indexOf(productId);
      const isProductAlreadyInCart = index > -1;

      let data = [];
      if (isProductAlreadyInCart) {
        data = cart.map((product) => {
          if (product.id === productId) {
            if (product.amount + 1 > productAmount) {
              toast.error("Quantidade solicitada fora de estoque");
              return product;
            }

            return { ...product, amount: product.amount + 1 };
          }
          return product;
        });
      } else {
        data = [...cart, { ...product, amount: 1 }];
      }

      setCart(data);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(data));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const data = cart.filter((product) => product.id !== productId);

      setCart(data);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(data));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stockResponse = await api.get("/stock");
      const stock: Stock[] = stockResponse.data;

      const productAmount = stock.reduce((acc, stock) => {
        if (stock.id === productId) {
          acc = stock.amount;
          return acc;
        }

        return acc;
      }, 0);

      const data = cart.map((product) => {
        if (product.id === productId) {
          if (product.amount + amount <= 0) {
            return product;
          }
          if (amount >= 1 && product.amount + amount > productAmount) {
            toast.error("Quantidade solicitada fora de estoque");
            return product;
          }

          return { ...product, amount: product.amount + amount };
        }

        return product;
      });

      setCart(data);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(data));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
