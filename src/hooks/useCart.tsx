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
      let isIncreaseValid = true;

      const productResponse = await api.get(`/products/${productId}`);
      const product: Product = productResponse.data;

      const stockResponse = await api.get(`/stock/${productId}`);
      const stock: Stock = stockResponse.data;

      const index = cart.map((product) => product.id).indexOf(productId);
      const isProductAlreadyInCart = index > -1;

      let data = [];
      if (isProductAlreadyInCart) {
        data = cart.map((product) => {
          if (product.id === productId) {
            if (product.amount + 1 > stock.amount) {
              isIncreaseValid = false;
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

      if (isIncreaseValid) {
        setCart(data);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(data));
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIdPosition = cart
        .map((product) => product.id)
        .indexOf(productId);
      const isProductInvalid = productIdPosition === -1;

      if (isProductInvalid) {
        toast.error("Erro na remoção do produto");
        return;
      }

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
      let isUpdateValid = true;
      const stockResponse = await api.get(`/stock/${productId}`);
      const stock: Stock = stockResponse.data;

      const data = cart.map((product) => {
        if (product.id === productId) {
          if (amount <= 0) {
            isUpdateValid = false;
            return product;
          }
          if (amount > stock.amount) {
            isUpdateValid = false;
            toast.error("Quantidade solicitada fora de estoque");
            return product;
          }

          return { ...product, amount };
        }

        return product;
      });

      if (isUpdateValid) {
        setCart(data);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(data));
      }
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
