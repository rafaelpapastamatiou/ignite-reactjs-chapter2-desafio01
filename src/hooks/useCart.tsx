import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyInCart = cart.find(product => product.id === productId)

      const responseStock = await api.get<Stock>(`/stock/${productId}`)

      const { data: stockedProduct } = responseStock

      let newAmount = productAlreadyInCart ? productAlreadyInCart.amount + 1 : 1

      if(newAmount > stockedProduct.amount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      let newCart: Product[]

      if(productAlreadyInCart){
        newCart = cart.map(product => product.id === productId ? {...product, amount: newAmount} : product)
      }
      else {
        const responseProduct = await api.get<Product>(`/products/${productId}`)

        const { data: productInfo } = responseProduct

        newCart = [
          ...cart, 
          { 
            id: productId, 
            amount: newAmount, 
            image: productInfo.image, 
            title: productInfo.title, 
            price: productInfo.price   
          }
        ]
      }

    setCart(newCart)
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const checkProductInCart = cart.find(product => product.id === productId)

      if(!checkProductInCart){
        throw new Error()
      }

      const newCart = [...cart].filter(product => product.id !== productId)

      setCart(newCart)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0){
        return;
      }

      const response = await api.get<Stock>(`/stock/${productId}`)

      const { data: stockedProduct } = response

      if(amount > stockedProduct.amount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = [...cart].map(product => product.id === productId ? {...product, amount} : product)

      setCart(newCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
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
