const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};

const checkStock = (variantId, quantity) => {
    return new Promise((resolve, reject) => {
        const checkStockQuery = `
            SELECT ws.product_variant_id, ws.quantity 
            FROM warehousestock ws 
            WHERE ws.product_variant_id = ? 
            AND ws.quantity >= ?
        `;
        connection.query(checkStockQuery, [variantId, quantity], (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results.length > 0);
            }
        });
    });
};

const queryDatabase = (query, params) => {
    return new Promise((resolve, reject) => {
        connection.query(query, params, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};

function updateTotalPrice(cartId, res) {
    const updateTotalPriceQuery = `
        UPDATE ShoppingCart sc
        JOIN (
            SELECT cart_id, SUM(total_price_item) AS new_total_price
            FROM CartItem
            WHERE cart_id = ?
            GROUP BY cart_id
        ) ci ON sc.cart_id = ci.cart_id
        SET sc.total_price = ci.new_total_price
        WHERE sc.cart_id = ?
    `;
    connection.query(updateTotalPriceQuery, [cartId, cartId], (updateError, updateResults) => {
        if (updateError) {
            console.error('Error updating total price of shopping cart:', updateError);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.status(200).json({ message: 'Cart updated successfully' });
    });
}

const getFinalPrice = (variantId) => {
    return new Promise((resolve, reject) => {
        // Gọi procedure trước
        const callProcedureQuery = 'CALL GetFinalPrice(?, @final_price)';
        connection.query(callProcedureQuery, [variantId], (error) => {
            if (error) {
                return reject(error);
            }

            // Sau đó, chọn biến đầu ra
            const selectResultQuery = 'SELECT @final_price AS final_price';
            connection.query(selectResultQuery, (selectError, results) => {
                if (selectError) {
                    return reject(selectError);
                }
                const finalPrice = results[0].final_price;
                resolve(finalPrice);
            });
        });
    });
};

const addToCartF = async (cartId, variantId, quantity, res) => {
    try {
        const isStockAvailable = await checkStock(variantId, quantity);
        if (!isStockAvailable) {
            return res.status(400).json({ error: 'Insufficient stock for the requested product.' });
        }

        const checkCartItemQuery = 'SELECT * FROM CartItem WHERE cart_id = ? AND variant_id = ?';
        const checkCartItemResults = await queryDatabase(checkCartItemQuery, [cartId, variantId]);

        if (checkCartItemResults.length === 0) {
            const productPrice = await getFinalPrice(variantId);
            const total_price_item = productPrice * quantity;
            const insertCartItemQuery = 'INSERT INTO CartItem (cart_id, variant_id, quantity, unit_price, total_price_item, created_at) VALUES (?, ?, ?, ?, ?, NOW())';
            await queryDatabase(insertCartItemQuery, [cartId, variantId, quantity, productPrice, total_price_item]);

            await updateTotalPrice(cartId, res);
        } else {
            const newQuantity = checkCartItemResults[0].quantity + quantity;
            const newTotalPrice = checkCartItemResults[0].total_price_item + (checkCartItemResults[0].unit_price * quantity);
            const updateCartItemQuery = 'UPDATE CartItem SET quantity = ?, total_price_item = ? WHERE cart_id = ? AND variant_id = ?';
            await queryDatabase(updateCartItemQuery, [newQuantity, newTotalPrice, cartId, variantId]);

            await updateTotalPrice(cartId, res);
        }
    } catch (error) {
        console.error('Error processing cart:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const addToCart = (connection) => (req, res) => {
    const { variantId, quantity } = req.body;
    const userId = req.user.id;
    console.log('variant',variantId);

    const getBuyerIdQuery = 'SELECT buyer_id FROM Buyer WHERE user_id = ?';

    connection.query(getBuyerIdQuery, [userId], (error, buyerResults) => {
        if (error) {
            console.error('Error getting buyer id:', error);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        if (buyerResults.length === 0) {
            res.status(404).json({ error: 'Buyer not found for the user' });
            return;
        }

        const buyerId = buyerResults[0].buyer_id;

        const getCartIdQuery = 'SELECT cart_id FROM ShoppingCart WHERE buyer_id = ?';

        connection.query(getCartIdQuery, [buyerId], async (error, cartResults) => {
            if (error) {
                console.error('Error getting cart id:', error);
                res.status(500).json({ error: 'Internal server error' });
                return;
            }

            if (cartResults.length === 0) {
                res.status(404).json({ error: 'Cart not found for the buyer' });
                return;
            }

            const cartId = cartResults[0].cart_id;

            await addToCartF(cartId, variantId, quantity, res);
        });
    });
};

const updateCartItem = (connection) => (req, res) => {
    const { variantId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    const getCartIdQuery = 'SELECT cart_id FROM ShoppingCart WHERE buyer_id = (SELECT buyer_id FROM Buyer WHERE user_id = ?)';

    connection.query(getCartIdQuery, [userId], (error, results) => {
        if (error) {
            console.error('Error getting cart id:', error);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        if (results.length === 0) {
            res.status(404).json({ error: 'Cart not found for the user' });
            return;
        }

        const cartId = results[0].cart_id;

        checkWarehouseStockAndUpdate(cartId, variantId, quantity, res);
    });
};

function checkWarehouseStockAndUpdate(cartId, variantId, quantity, res) {
    const getWarehouseStockQuery = 'SELECT quantity FROM warehousestock WHERE product_variant_id = ?';

    connection.query(getWarehouseStockQuery, [variantId], (stockError, stockResults) => {
        if (stockError) {
            console.error('Error getting warehouse stock:', stockError);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        if (stockResults.length === 0) {
            res.status(404).json({ error: 'Warehouse stock not found for the product variant' });
            return;
        }

        const availableStock = stockResults[0].quantity;

        if (quantity > availableStock) {
            res.status(400).json({ error: 'Requested quantity exceeds available stock' });
            return;
        }

        updateCartItemF(cartId, variantId, quantity, res);
    });
}

function updateCartItemF(cartId, variantId, quantity, res) {
    if (quantity === 0) {
        const deleteCartItemQuery = 'DELETE FROM CartItem WHERE cart_id = ? AND variant_id = ?';
        connection.query(deleteCartItemQuery, [cartId, variantId], (deleteError, deleteResults) => {
            if (deleteError) {
                console.error('Error deleting cart item:', deleteError);
                res.status(500).json({ error: 'Internal server error' });
                return;
            }
            res.status(200).json({ message: 'Product removed from cart' });
        });
    } else {
        const getProductPriceQuery = 'SELECT price FROM Product_productVariant WHERE id = ?';
        connection.query(getProductPriceQuery, [variantId], (priceError, priceResults) => {
            if (priceError) {
                console.error('Error getting product price:', priceError);
                res.status(500).json({ error: 'Internal server error' });
                return;
            }

            if (priceResults.length === 0) {
                res.status(404).json({ error: 'Product variant not found' });
                return;
            }

            const productPrice = priceResults[0].price;

            const total_price = productPrice * quantity;

            const updateCartItemQuery = 'UPDATE CartItem SET quantity = ?, total_price_item = ? WHERE cart_id = ? AND variant_id = ?';
            connection.query(updateCartItemQuery, [quantity, total_price, cartId, variantId], (updateError, updateResults) => {
                if (updateError) {
                    console.error('Error updating cart item:', updateError);
                    res.status(500).json({ error: 'Internal server error' });
                    return;
                }
                res.status(200).json({ message: 'Product quantity updated in cart' });
            });
        });
    }
}
const removeFromCart = (connection) => (req, res) => {
    const { variantId } = req.params;
    const userId = req.user.id;
    console.log(req.user)

 
    const getBuyerIdQuery = 'SELECT buyer_id FROM Buyer WHERE user_id = ?';

    connection.query(getBuyerIdQuery, [userId], (error, results) => {
        if (error) {
            console.error('Error getting buyer id:', error);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        if (results.length === 0) {
            res.status(404).json({ error: 'Buyer not found for the user' });
            return;
        }

        const buyerId = results[0].buyer_id;

       
        removeFromCartF(buyerId, variantId, res);
    });
};

function removeFromCartF(buyerId, variantId, res) {
    const findCartIdQuery = 'SELECT cart_id FROM ShoppingCart WHERE buyer_id = ?';
    connection.query(findCartIdQuery, [buyerId], (error, results) => {
        if (error) {
            console.error('Error finding cart id:', error);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        if (results.length === 0) {
            res.status(404).json({ error: 'Shopping cart not found for the buyer' });
            return;
        }

        const cartId = results[0].cart_id;

        const deleteCartItemQuery = 'DELETE FROM CartItem WHERE cart_id = ? AND variant_id = ?';
        connection.query(deleteCartItemQuery, [cartId, variantId], (error, results) => {
            if (error) {
                console.error('Error deleting cart item:', error);
                res.status(500).json({ error: 'Internal server error' });
                return;
            }

            const calculateTotalPriceQuery = 'SELECT SUM(total_price_item) AS total FROM CartItem WHERE cart_id = ?';
            connection.query(calculateTotalPriceQuery, [cartId], (error, results) => {
                if (error) {
                    console.error('Error calculating total price:', error);
                    res.status(500).json({ error: 'Internal server error' });
                    return;
                }

                const totalPrice = results[0].total || 0;

                const updateTotalPriceQuery = 'UPDATE ShoppingCart SET total_price = ? WHERE cart_id = ?';
                connection.query(updateTotalPriceQuery, [totalPrice, cartId], (error, results) => {
                    if (error) {
                        console.error('Error updating total price:', error);
                        res.status(500).json({ error: 'Internal server error' });
                        return;
                    }

                    res.status(200).json({ message: 'Product removed from cart successfully' });
                });
            });
        });
    });
}

module.exports = {
    addToCart,
    updateCartItem,
    removeFromCart
};
