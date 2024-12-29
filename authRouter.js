// authRouter.js
const express = require('express');
const router = express.Router();

module.exports = (connection) => {
    router.post('/register', (req, res) => {
        const { username, email, password, fullname } = req.body;
        const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' '); // Lấy thời gian hiện tại
        const userType = 'buyer'; // Mặc định là Buyer

        // Thêm một người dùng mới vào bảng E_User
        const userQuery = 'INSERT INTO E_User (username, email, password, fullname, userType, created_at) VALUES (?, ?, ?, ?, ?, ?)';
        connection.query(userQuery, [username, email, password, fullname, userType, createdAt], (userError, userResults) => {
            if (userError) {
                console.error('Error executing user query:', userError);
                res.status(500).json({ error: 'Internal server error' });
                return;
            }

            // Lấy ID của người dùng mới được tạo từ kết quả của câu truy vấn
            const userId = userResults.insertId;

            // Tạo một bản ghi mới trong bảng Buyer với user_id tương ứng và giờ tạo
            const createBuyerQuery = 'INSERT INTO Buyer (user_id, created_at) VALUES (?, ?)';
            connection.query(createBuyerQuery, [userId, createdAt], (buyerError, buyerResults) => {
                if (buyerError) {
                    console.error('Error creating buyer record:', buyerError);
                    res.status(500).json({ error: 'Internal server error' });
                    return;
                }

                // Sau khi thêm một bản ghi mới vào bảng Buyer, chúng ta có thể lấy buyer_id từ user_id
                const getBuyerIdQuery = 'SELECT buyer_id FROM Buyer WHERE user_id = ?';
                connection.query(getBuyerIdQuery, [userId], (selectError, selectResults) => {
                    if (selectError) {
                        console.error('Error getting buyer id:', selectError);
                        res.status(500).json({ error: 'Internal server error' });
                        return;
                    }

                    if (selectResults.length === 0) {
                        console.error('Buyer not found for the user:', userId);
                        res.status(404).json({ error: 'Buyer not found for the user' });
                        return;
                    }

                    const buyerId = selectResults[0].buyer_id;

                    // Tạo giỏ hàng cho người dùng mới và cung cấp giá trị cho thuộc tính created_at và total_price
                    const cartQuery = 'INSERT INTO ShoppingCart (buyer_id, created_at, total_price) VALUES (?, ?, 0)';
                    connection.query(cartQuery, [buyerId, createdAt], (cartError, cartResults) => {
                        if (cartError) {
                            console.error('Error creating shopping cart:', cartError);
                            res.status(500).json({ error: 'Internal server error' });
                            return;
                        }

                        res.status(201).json({ message: 'User created successfully and shopping cart created' });
                    });
                });
            });
        });
    });





    // Route để đăng nhập
    const jwt = require('jsonwebtoken');

    router.post('/login', (req, res) => {
        const { username, password } = req.body;
        const query = 'SELECT * FROM E_User WHERE username = ? AND password = ?';
        connection.query(query, [username, password], (error, results) => {
            if (error) {
                console.error('Error executing query:', error);
                res.status(500).json({ error: 'Internal server error' });
                return;
            }
            if (results.length === 0) {
                res.status(401).json({ error: 'Invalid username or password' });
                return;
            }
            console.log("resultlogin", results[0].User_id);

            // User found, generate token
            const user = results[0];
            console.log(user.User_id);
            const token = jwt.sign({ id: user.User_id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '4h' });

            // Save the token to the user's record in the database
            const updateTokenQuery = 'UPDATE E_User SET token = ? WHERE user_id = ?';
            connection.query(updateTokenQuery, [token, user.User_id], (updateError, updateResults) => {
                if (updateError) {
                    console.error('Error updating token:', updateError);
                    res.status(500).json({ error: 'Internal server error create token' });
                    return;
                }
                res.status(200).json({ message: 'Login successful', token });
            });
        });
    });
    // Router để chuyển người dùng từ buyer sang seller
    router.put('/changeToSeller/:id', (req, res) => {
        const userId = req.params.id;
        const queryUpdateUserType = 'UPDATE E_User SET userType = "seller" WHERE user_id = ?';
        const queryInsertSeller = 'INSERT INTO Seller (user_id, created_at) VALUES (?, ?)';
        const queryDeleteFromBuyer = 'DELETE FROM Buyer WHERE user_id = ?'; // Thêm câu truy vấn để xóa dữ liệu từ bảng Buyer

        const currentDate = new Date();

        // Bước 1: Cập nhật loại người dùng từ 'user' thành 'seller'
        connection.query(queryUpdateUserType, [userId], (error, results) => {
            if (error) {
                console.error('Error executing query:', error);
                res.status(500).json({ error: 'Internal server error' });
                return;
            }

            // Bước 2: Thêm dữ liệu vào bảng Seller
            connection.query(queryInsertSeller, [userId, currentDate], (error, results) => {
                if (error) {
                    console.error('Error executing query:', error);
                    res.status(500).json({ error: 'Internal server error' });
                    return;
                }

                // Bước 3: Xóa dữ liệu từ bảng Buyer
                // connection.query(queryDeleteFromBuyer, [userId], (error, results) => {
                //     if (error) {
                //         console.error('Error executing query:', error);
                //         res.status(500).json({ error: 'Internal server error' });
                //         return;
                //     }
                //     res.status(200).json({ message: 'User type updated successfully and added to Seller table, and data removed from Buyer table' });
                // });
            });
        });
    });


    const isSeller = (req, res, next) => {
        const userId = req.user.User_id; // Giả sử userId là trường id của người dùng trong cơ sở dữ liệu
        console.log('userID', userId);
        // Thực hiện truy vấn để kiểm tra xem người dùng có phải là admin hay không
        const query = 'SELECT * FROM e_user WHERE user_id = ? AND userType = "seller"';
        connection.query(query, [userId], (error, results) => {
            if (error) {
                console.error('Error executing query:', error);
                return res.status(500).json({ error: 'Internal server error query is admin' });
            }

            if (results.length === 0) {
                return res.status(403).json({ error: 'You are not an admin' });
            }
            // Nếu người dùng là admin, tiếp tục xử lý request
            next();
        });
    };

    router.post('/addProduct', authenticateToken, isSeller, (req, res) => {
        const { name, description, price, stock_quantity, category } = req.body;

        // Kiểm tra xem người dùng có quyền seller hay không
        if (req.user.userType !== 'seller') {
            res.status(403).json({ error: 'Unauthorized access. Only sellers can add products.' });
            return;
        }
        console.log("user_id_d", req.user.User_id);
        // Tìm category_id dựa trên tên category được nhận từ yêu cầu
        const findCategoryQuery = 'SELECT category_id FROM Category WHERE category_name = ?';
        connection.query(findCategoryQuery, [category], (categoryError, categoryResults) => {
            if (categoryError) {
                console.error('Error finding category:', categoryError);
                res.status(500).json({ error: 'Internal server error finding category' });
                return;
            }

            // Kiểm tra xem category có tồn tại không
            if (categoryResults.length === 0) {
                res.status(404).json({ error: 'Category not found' });
                return;
            }
            // Lấy category_id từ kết quả truy vấn
            const categoryId = categoryResults[0].category_id;

            // Thêm sản phẩm vào database với product id tự động tăng, seller_id từ token và created_at là thời gian hiện tại
            const insertProductQuery = 'INSERT INTO Product (name, description, price, stock_quantity, category_id, seller_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())';
            connection.query(insertProductQuery, [name, description, price, stock_quantity, categoryId, req.user.User_id], (error, results) => {
                if (error) {
                    console.error('Error executing query:', error);
                    res.status(500).json({ error: 'Internal server error add product' });
                    return;
                }
                res.status(201).json({ message: 'Product added successfully', productId: results.insertId });
            });
        });
    });
     const getFinalPrice = (productId) => {
        return new Promise((resolve, reject) => {
            // Gọi procedure trước
            const callProcedureQuery = 'CALL GetFinalPrice(?, @final_price)';
            connection.query(callProcedureQuery, [productId], (error) => {
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
                    console.log('test24',finalPrice);
                });
            });
        });
    };

    // Hàm để thêm sản phẩm vào giỏ hàng
    const addToCart = async (cartId, productId, quantity, res) => {
        try {
            const checkCartItemQuery = 'SELECT * FROM CartItem WHERE cart_id = ? AND product_id = ?';
            const checkCartItemResults = await queryDatabase(checkCartItemQuery, [cartId, productId]);
    
            if (checkCartItemResults.length === 0) {
                console.log('pid',productId);
                // If the product is not already in the cart, get the final price and add it
                const productPrice = await getFinalPrice(productId);
                const total_price_item = productPrice * quantity;
                const insertCartItemQuery = 'INSERT INTO CartItem (cart_id, product_id, quantity, unit_price, total_price_item, created_at) VALUES (?, ?, ?, ?, ?, NOW())';
                await queryDatabase(insertCartItemQuery, [cartId, productId, quantity, productPrice, total_price_item]);
    
                // After adding the product, update the total price of the cart
                await updateTotalPrice(cartId, res);
            } else {
                // If the product is already in the cart, update the quantity and total price
                const newQuantity = checkCartItemResults[0].quantity + quantity;
                const newTotalPrice = checkCartItemResults[0].total_price_item + (checkCartItemResults[0].unit_price * quantity);
                const updateCartItemQuery = 'UPDATE CartItem SET quantity = ?, total_price_item = ? WHERE cart_id = ? AND product_id = ?';
                await queryDatabase(updateCartItemQuery, [newQuantity, newTotalPrice, cartId, productId]);
    
                // After updating the quantity, update the total price of the cart
                await updateTotalPrice(cartId, res);
            }
        } catch (error) {
            console.error('Error processing cart:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
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
    router.post('/add-to-cart', authenticateToken, async (req, res) => {
        const { productId, quantity } = req.body;
        const userId = req.user.User_id;
        console.log('test');
        // Truy vấn để lấy buyer_id từ user_id
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

            // Truy vấn để lấy cart_id từ buyer_id
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
                console.log('test2');

                // Thêm sản phẩm vào giỏ hàng
                await addToCart(cartId, productId, quantity, res);
                console.log('end');
            });
        });
    });
 
    // Hàm cập nhật total_price của giỏ hàng
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
    

    router.put('/update-cart-item/:productId', authenticateToken, (req, res) => {
        const { productId } = req.params;
        const { quantity } = req.body;
        const userId = req.user.User_id;

        // Lấy cart_id từ user_id
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

            // Cập nhật số lượng sản phẩm trong giỏ hàng
            updateCartItem(cartId, productId, quantity, res);
        });
    });
    ;

    // Hàm để cập nhật số lượng sản phẩm trong giỏ hàng
    function updateCartItem(cartId, productId, quantity, res) {
        // Truy vấn để lấy giá của sản phẩm từ bảng Product
        const getProductPriceQuery = 'SELECT price FROM Product WHERE product_id = ?';

        connection.query(getProductPriceQuery, [productId], (error, results) => {
            if (error) {
                console.error('Error getting product price:', error);
                res.status(500).json({ error: 'Internal server error' });
                return;
            }

            if (results.length === 0) {
                res.status(404).json({ error: 'Product not found' });
                return;
            }

            const productPrice = results[0].price;

            // Tính toán total_price mới
            const total_price = productPrice * quantity;

            // Cập nhật số lượng và total_price trong bảng CartItem
            const updateCartItemQuery = 'UPDATE CartItem SET quantity = ?, total_price_item = ? WHERE cart_id = ? AND product_id = ?';
            connection.query(updateCartItemQuery, [quantity, total_price, cartId, productId], (updateError, updateResults) => {
                if (updateError) {
                    console.error('Error updating cart item:', updateError);
                    res.status(500).json({ error: 'Internal server error' });
                    return;
                }
                res.status(200).json({ message: 'Product quantity updated in cart' });
            });
        });
    }

    // Endpoint Xóa Sản Phẩm Khỏi Giỏ Hàng
    router.delete('/remove-from-cart/:productId', authenticateToken, (req, res) => {
        const { productId } = req.params;
        const userId = req.user.User_id;

        // Lấy buyer_id từ user_id
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

            // Xóa sản phẩm khỏi giỏ hàng
            removeFromCart(buyerId, productId, res);
        });
    });

    // Hàm Xóa Sản Phẩm Khỏi Giỏ Hàng
    function removeFromCart(buyerId, productId, res) {
        // Xác định giá của sản phẩm cần xóa
        const getProductPriceQuery = 'SELECT price FROM Product WHERE product_id = ?';
        connection.query(getProductPriceQuery, [productId], (error, results) => {
            if (error) {
                console.error('Error getting product price:', error);
                res.status(500).json({ error: 'Internal server error' });
                return;
            }

            if (results.length === 0) {
                res.status(404).json({ error: 'Product not found' });
                return;
            }

            const productPrice = results[0].price;

            // Tìm cart_id từ buyer_id
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

                // Xóa sản phẩm khỏi giỏ hàng
                const deleteCartItemQuery = 'DELETE FROM CartItem WHERE cart_id = ? AND product_id = ?';
                connection.query(deleteCartItemQuery, [cartId, productId], (error, results) => {
                    if (error) {
                        console.error('Error deleting cart item:', error);
                        res.status(500).json({ error: 'Internal server error' });
                        return;
                    }

                    // Tính lại total_price của giỏ hàng sau khi xóa sản phẩm
                    const calculateTotalPriceQuery = 'SELECT SUM(total_price_item) AS total FROM CartItem WHERE cart_id = ?';
                    connection.query(calculateTotalPriceQuery, [cartId], (error, results) => {
                        if (error) {
                            console.error('Error calculating total price:', error);
                            res.status(500).json({ error: 'Internal server error' });
                            return;
                        }

                        const totalPrice = results[0].total | 0;
                        console.log(totalPrice);

                        // Cập nhật lại total_price trong bảng ShoppingCart
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
        });
    }

    const getBuyerId = (userId) => {
        return new Promise((resolve, reject) => {
            const getBuyerIdQuery = 'SELECT buyer_id FROM Buyer WHERE user_id = ?';
            connection.query(getBuyerIdQuery, [userId], (error, results) => {
                if (error) {
                    reject(error);
                } else if (results.length === 0) {
                    reject('Buyer not found for the user');
                } else {
                    resolve(results[0].buyer_id);
                }
            });
        });
    };

    const getCartItems = (buyerId) => {
        return new Promise((resolve, reject) => {
            const getCartItemsQuery = 'SELECT * FROM CartItem WHERE cart_id IN (SELECT cart_id FROM ShoppingCart WHERE buyer_id = ?)';
            connection.query(getCartItemsQuery, [buyerId], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    };

    const checkStock = (cartItems) => {
        return new Promise((resolve, reject) => {
            const productIds = cartItems.map(item => item.PRODUCT_ID);
            const checkStockQuery = 'SELECT product_id, stock_quantity FROM Product WHERE product_id IN (?)';
            connection.query(checkStockQuery, [productIds], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    };

    const checkInsufficientStock = (stockResults, cartItems) => {
        const insufficientStockItems = [];
        cartItems.forEach(item => {
            const stockItem = stockResults.find(stock => stock.product_id === item.PRODUCT_ID);
            if (stockItem && stockItem.stock_quantity < item.quantity) {
                insufficientStockItems.push(item.PRODUCT_ID);
            }
        });
        return insufficientStockItems;
    };

    const calculateTotalAmount = (cartItems) => {
        return cartItems.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
    };

    const createOrder = (buyerId, totalAmount,voucher_id=null) => {
        console.log(totalAmount);
        return new Promise((resolve, reject) => {
            const createOrderQuery = 'INSERT INTO E_Order (Buyer_id, total_amount, Order_status_id, created_at,voucher_id) VALUES (?, ?, 1, NOW(),?)';
            connection.query(createOrderQuery, [buyerId, totalAmount,voucher_id], (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result.insertId);
                }
            });
        });
    };

    const createOrderItems = (orderId, cartItems) => {
        // console.log(cartItems);
        return new Promise((resolve, reject) => {
            const orderItemsValues = cartItems.map(item => [orderId, item.PRODUCT_ID, item.quantity, item.unit_price * item.quantity, new Date()]);
            // console.log(cartItems);
            // console.log(item);
            const createOrderItemsQuery = 'INSERT INTO OrderItem (Order_id, Product_id, quantity, price, created_at) VALUES ?';
            connection.query(createOrderItemsQuery, [orderItemsValues], (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    };

    const createPayment = (orderId, buyerId) => {
        return new Promise((resolve, reject) => {
            const createPaymentQuery = 'INSERT INTO Payment (Order_id, Buyer_id, payment_method, payment_status, created_at) VALUES (?, ?, ?, ?, NOW())';
            connection.query(createPaymentQuery, [orderId, buyerId, 'Credit Card', 'Paid'], (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    };

    const createShipment = (orderId, productId, carrier_id) => {
        return new Promise((resolve, reject) => {
            const createShipmentQuery = 'INSERT INTO Shipment (Order_id, Product_id, carrier_id, shipping_address, shipping_status, created_at) VALUES (?, ?, ?, ?, ?, NOW())';
            connection.query(createShipmentQuery, [orderId, productId, carrier_id, '123 Shipping St, City, Country', 'Pending'], (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    };

    const updateProductQuantity = (cartItems) => {
        return new Promise((resolve, reject) => {
            const updates = cartItems.map(item => {
                return new Promise((resolve, reject) => {
                    const query = `
                        UPDATE Product
                        SET stock_quantity = stock_quantity - ?
                        WHERE Product_id = ?
                    `;
                    connection.query(query, [item.quantity, item.Product_id], (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve();
                        }
                    });
                });
            });

            Promise.all(updates)
                .then(() => resolve())
                .catch(error => reject(error));
        });
    };

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


    const deleteCartItems = (buyerId) => {
        return new Promise((resolve, reject) => {
            const deleteCartItemsQuery = 'DELETE FROM CartItem WHERE cart_id IN (SELECT cart_id FROM ShoppingCart WHERE buyer_id = ?)';
            connection.query(deleteCartItemsQuery, [buyerId], (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    };

    const deleteCartItem = (cartItemId, buyerId) => {
        return new Promise((resolve, reject) => {
            const deleteCartItemsQuery = 'DELETE FROM CartItem WHERE cart_item_id =? and cart_id IN (SELECT cart_id FROM ShoppingCart WHERE buyer_id = ?)';
            connection.query(deleteCartItemsQuery, [cartItemId, buyerId], (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    };

    const updateOrderStatus = (Order_status_id, orderId) => {
        return new Promise((resolve, reject) => {
            const updateOrderStatusQuery = 'UPDATE E_Order SET Order_status_id = ? WHERE Order_id = ?';
            connection.query(updateOrderStatusQuery, [Order_status_id, orderId], (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    };

    const getCartItem = (buyerId, productId) => {
        return new Promise((resolve, reject) => {
            // Truy vấn SQL để lấy thông tin của cart item
            const getCartItemQuery = 'SELECT * FROM CartItem WHERE cart_id IN (SELECT cart_id FROM ShoppingCart WHERE buyer_id = ?) AND cart_item_id = ?';
            connection.query(getCartItemQuery, [buyerId, productId], (error, results) => {
                if (error) {
                    reject(error); // Trả về lỗi nếu có lỗi xảy ra trong quá trình thực hiện truy vấn
                } else {
                    resolve(results); // Trả về kết quả nếu truy vấn thành công
                }
            });
        });
    };

    const updateOrderTotalPrice = (orderId, newTotalPrice) => {
        return new Promise((resolve, reject) => {
            const query = `UPDATE E_Order SET total_amount = ? WHERE Order_id = ?`;
            connection.query(query, [newTotalPrice, orderId], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    };
    const getOrderItems = (orderId) => {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM OrderItem WHERE Order_id = ?`;
            connection.query(query, [orderId], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    };

    const updateShoppingCartTotal = (cartId, newTotalPrice) => {
        return new Promise((resolve, reject) => {
            const updateTotalPriceQuery = 'UPDATE ShoppingCart SET total_price = ? WHERE cart_id = ?';
            connection.query(updateTotalPriceQuery, [newTotalPrice, cartId], (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    };
    const getShoppingCartTotal = async (cartId) => {
        const query1 = 'SELECT SUM(total_price_item) AS total FROM CartItem WHERE Cart_id = ?';
        const [result] = await query(query1, [cartId]);
        console.log('result',result);
        return result.total || 0;
    };
    const getApplicableDiscount = (buyerId, totalAmount) => {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT discount_percentage
                FROM Discount
                WHERE CURDATE() BETWEEN start_date AND end_date
                  AND (min_order_value IS NULL OR ? >= min_order_value)
                ORDER BY discount_percentage DESC
                LIMIT 1
            `;
            connection.query(query, [totalAmount], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results.length > 0 ? results[0].discount_percentage : null);
                }
            });
        });
    };
    const getOrderById = (orderId) => {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM E_Order WHERE Order_id = ?`;
            connection.query(query, [orderId], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results.length > 0 ? results[0] : null);
                }
            });
        });
    };

    const createInvoice = (orderId, totalAmount) => {
        return new Promise((resolve, reject) => {
            const createInvoiceQuery = 'INSERT INTO Invoice (Order_id, Invoice_status_id, total_amount, created_at) VALUES (?, ?, ?, NOW())';
            connection.query(createInvoiceQuery, [orderId, 3, totalAmount], (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result.insertId);
                }
            });
        });
    };

    const getCartItemByProductId = (buyerId, productId) => {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT ci.*, c.Cart_id 
                FROM CartItem ci
                JOIN shoppingCart c ON ci.Cart_id = c.Cart_id
                WHERE c.Buyer_id = ? AND ci.Product_id = ? 
                LIMIT 1
            `;

            connection.query(query, [buyerId, productId], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results[0]);
                }
            });
        });
    };
    const getVoucherPrice = async (voucherId, totalAmount, userId, res) => {
        try {
            const voucherQuery = `
            SELECT discount_percentage, apply_once_per_order, once_per_customer
            FROM discount_voucher
            WHERE voucher_id = ? AND NOW() BETWEEN start_date AND end_date
        `;
            const voucherResults = await query(voucherQuery, [voucherId]);
    
            if (voucherResults.length === 0) {
                res.status(400).json({ error: 'Voucher không hợp lệ hoặc đã hết hạn' });
                return null;
            }
    
            const voucher = voucherResults[0];
    
            // Kiểm tra điều kiện apply_once_per_customer
            if (voucher.once_per_customer) {
                const customerVoucherQuery = `
                    SELECT COUNT(*) AS count
                    FROM E_Order
                    WHERE Buyer_id = ? AND voucher_id = ?
                `;
                const [customerVoucherResult] = await query(customerVoucherQuery, [userId, voucherId]);
    
                if (customerVoucherResult.count > 0) {
                    res.status(400).json({ error: 'Voucher này chỉ được áp dụng một lần cho mỗi khách hàng.' });
                    return null;
                }
            }
    
            // Kiểm tra điều kiện apply_once_per_order
            if (voucher.apply_once_per_order) {
                const orderVoucherQuery = 'SELECT COUNT(*) AS count FROM E_Order WHERE voucher_id = ?';
                const [orderVoucherResult] = await query(orderVoucherQuery, [voucherId]);
    
                if (orderVoucherResult.count > 0) {
                    res.status(400).json({ error: 'Voucher này chỉ được áp dụng một lần cho mỗi đơn hàng.' });
                    return null;
                }
            }
    
            const discountPercentage = voucher.discount_percentage;
            const discountAmount = (discountPercentage / 100) * totalAmount;
            const finalPrice = totalAmount - discountAmount;
    
            return { finalPrice, voucher };
        } catch (error) {
            console.error('Error in getVoucherPrice:', error);
            res.status(500).json({ error: 'Internal server error' });
            return null;
        }
    };
    
    router.post('/checkout', authenticateToken, async (req, res) => {
        const userId = req.user.User_id;
        const voucherId = req.body.voucher_id;
        console.log('voucher', voucherId);
    
        try {
            const buyerId = await getBuyerId(userId);
            const cartItems = await getCartItems(buyerId);
    
            if (cartItems.length === 0) {
                return res.status(400).json({ error: 'Shopping cart is empty' });
            }
    
            const stockResults = await checkStock(cartItems);
            const insufficientStockItems = checkInsufficientStock(stockResults, cartItems);
    
            if (insufficientStockItems.length > 0) {
                return res.status(400).json({ error: 'Insufficient stock for products: ' + insufficientStockItems.join(', ') });
            }
    
            let totalAmount = 0;
            console.log('piiid', cartItems);
            for (let item of cartItems) {
                const finalPrice = await getFinalPrice(item.PRODUCT_ID);
                item.total_price_item = finalPrice * item.quantity;
                totalAmount += item.total_price_item;
            }
            console.log('totlaa3', totalAmount);
    
            if (voucherId) {
                const voucherResult = await getVoucherPrice(voucherId, totalAmount, userId, res);
                if (!voucherResult) {
                    return; // Error response already sent in getVoucherPrice
                }
    
                totalAmount = voucherResult.finalPrice;
            }
            console.log('totlaa2', totalAmount);
    
            const discountPercentage = await getApplicableDiscount(buyerId, totalAmount);
            let discountAmount = 0;
            if (discountPercentage) {
                discountAmount = (discountPercentage / 100) * totalAmount;
                totalAmount -= discountAmount;
            }
            console.log('totlaa', totalAmount);
    
            const orderId = await createOrder(buyerId, totalAmount, voucherId);
    
            if (discountPercentage) {
                const saveDiscountDetailQuery = `
                    INSERT INTO DiscountDetail (Discount_id, Order_id, discounted_amount, created_at)
                    SELECT Discount_id, ?, ?, NOW()
                    FROM Discount
                    WHERE CURDATE() BETWEEN start_date AND end_date
                      AND (min_order_value IS NULL OR ? >= min_order_value)
                    ORDER BY discount_percentage DESC
                    LIMIT 1
                `;
                await query(saveDiscountDetailQuery, [orderId, discountAmount, totalAmount + discountAmount]);
                await updateOrderTotalPrice(orderId, totalAmount);
            }
    
            await createOrderItems(orderId, cartItems);
    
            // Cập nhật lại total_price của shopping cart
            const cartIdQuery = 'SELECT cart_id FROM ShoppingCart WHERE buyer_id = ?';
            const cartResults = await query(cartIdQuery, [buyerId]);
            const cartId = cartResults[0].cart_id;
            const currentTotalPrice = await getShoppingCartTotal(cartId);
            const newTotalPrice = Math.max(currentTotalPrice - totalAmount, 0);
            await updateShoppingCartTotal(cartId, newTotalPrice);
    
            // Xóa giỏ hàng sau khi đã checkout
            await deleteCartItems(buyerId);
    
            return res.status(200).json({ message: 'Order created successfully, please proceed to payment', orderId });
        } catch (error) {
            console.error('Error during checkout:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
    

    router.post('/checkout-item/:cartItemId', authenticateToken, async (req, res) => {
        try {
            const userId = req.user.User_id;
            const cartItemId = req.params.cartItemId;
            const voucherId = req.body.voucher_id;  // Get the voucher ID from the request body
        
            // Lấy buyer_id từ user_id
            const buyerId = await getBuyerId(userId);
        
            // Lấy thông tin của cart item
            const cartItem = await getCartItem(buyerId, cartItemId);
        
            // Kiểm tra xem cart item có tồn tại không
            if (cartItem[0]==undefined) {
                return res.status(404).json({ error: 'Cart item not found' });
            }
        
            // Kiểm tra số lượng tồn kho của sản phẩm trong cart item
            const stockResults = await checkStock([cartItem]);
            const insufficientStock = checkInsufficientStock(stockResults, [cartItem]);
            if (insufficientStock.length > 0) {
                return res.status(400).json({ error: 'Insufficient stock for product: ' + insufficientStock.join(', ') });
            }
        
            // Tạo đơn hàng cho cart item
            console.log(cartItem)
            let finalTotalPrice = cartItem[0].total_price_item;
    
            if (voucherId) {
                const voucherResult = await getVoucherPrice(voucherId, finalTotalPrice, userId, res);
                if (!voucherResult) {
                    return; // Error response already sent in getVoucherPrice
                }
                finalTotalPrice = voucherResult.finalPrice;
            }
    
            const orderId = await createOrder(buyerId, finalTotalPrice, voucherId);
        
            // Áp dụng discount nếu có
            const discountPercentage = await getApplicableDiscount(buyerId, finalTotalPrice);
            if (discountPercentage) {
                const discountAmount = (discountPercentage / 100) * finalTotalPrice;
                finalTotalPrice -= discountAmount;
        
                // Lưu thông tin discount vào DiscountDetail
                const saveDiscountDetailQuery = `
                    INSERT INTO DiscountDetail (Discount_id, Order_id, discounted_amount, created_at)
                    SELECT Discount_id, ?, ?, NOW()
                    FROM Discount
                    WHERE CURDATE() BETWEEN start_date AND end_date
                      AND (min_order_value IS NULL OR ? >= min_order_value)
                    ORDER BY discount_percentage DESC
                    LIMIT 1
                `;
                await query(saveDiscountDetailQuery, [orderId, discountAmount, finalTotalPrice]);
        
                // Cập nhật lại total_price của order sau khi áp dụng discount
                await updateOrderTotalPrice(orderId, finalTotalPrice);
            }
        
            // Tạo các mục đơn hàng
            await createOrderItems(orderId, cartItem);
        
            // Cập nhật lại total_price của shopping cart
            const cartId = cartItem[0].CART_ID;
            console.log('cart', cartId);
            const currentTotalPrice = await getShoppingCartTotal(cartId);
            console.log('df', cartItem, 'newtl', currentTotalPrice);
            const newTotalPrice = currentTotalPrice - cartItem[0].total_price_item;
            console.log('new', newTotalPrice);
            await updateShoppingCartTotal(cartId, Math.max(newTotalPrice, 0));
        
            // Xóa cart item sau khi đã tạo đơn hàng
            const deleteCartItemQuery = 'DELETE FROM CartItem WHERE cart_item_id = ?';
            await query(deleteCartItemQuery, [cartItemId]);
        
            // Trả về phản hồi khi thanh toán thành công
            return res.status(200).json({ message: 'Order created successfully, please proceed to payment', orderId });
        } catch (error) {
            console.error('Error during checkout for cart item:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.post('/confirm-payment/:orderId', authenticateToken, async (req, res) => {
        const userId = req.user.User_id;
        const orderId = req.params.orderId;
    
        try {
            const buyerId = await getBuyerId(userId);
            const order = await getOrderById(orderId);
            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }
    
            const orderItems = await getOrderItems(orderId);
            if (orderItems.length === 0) {
                return res.status(404).json({ error: 'No order items found for this order' });
            }
    
            const cartItems = [];
            for (const orderItem of orderItems) {
                const cartItem = await getCartItemByProductId(buyerId, orderItem.product_id);
                if (cartItem) {
                    cartItems.push(cartItem);
                }
            }
    
            if (cartItems.length === 0) {
                return res.status(404).json({ error: 'No cart items found for this order' });
            }
    
            await createPayment(orderId, buyerId);
    
            for (const orderItem of orderItems) {
                await createShipment(orderId, orderItem.product_id, 1);
            }
    
            await updateProductQuantity(cartItems);
            await updateOrderStatus(3, orderId);
            await createInvoice(orderId, order.total_amount);
    
            return res.status(200).json({ message: 'Payment confirmed and order processed successfully' });
        } catch (error) {
            console.error('Error during payment confirmation:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });



    // Hàm để tạo daily deal
    const createDailyDeal = (dealName, startDate, endDate, discountPercentage) => {
        return new Promise((resolve, reject) => {
            const query = `
            INSERT INTO daily_deal (deal_name, start_date, end_date, discount_percentage, created_at) 
            VALUES (?, ?, ?, ?, NOW())
        `;
            connection.query(query, [dealName, startDate, endDate, discountPercentage], (error, results) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results.insertId);
                }
            });
        });
    };

    // Hàm để liên kết sản phẩm với daily deal
    const addProductToDailyDeal = (dailyDealId, productId) => {
        return new Promise((resolve, reject) => {
            // First, get the end_date from the dailydeal table
            const getEndDateQuery = 'SELECT end_date FROM daily_deal WHERE daily_deal_id = ?';
            
            connection.query(getEndDateQuery, [dailyDealId], (error, results) => {
                if (error) {
                    return reject(error);
                }
                
                if (results.length === 0) {
                    return reject(new Error('Daily deal not found'));
                }
                
                const validUntil = results[0].end_date;
                
                // Now insert into productdailydeal with the valid_until date
                const insertQuery = `
                    INSERT INTO productdailydeal (Product_id, daily_deal_id, valid_until) 
                    VALUES (?, ?, ?)
                `;
                
                connection.query(insertQuery, [productId, dailyDealId, validUntil], (error, insertResults) => {
                    if (error) {
                        return reject(error);
                    }
                    
                    resolve();
                });
            });
        });
    };
    

   // Endpoint để tạo daily deal
// Endpoint để tạo daily deal
router.post('/daily-deal', authenticateToken, async (req, res) => {
    try {
        const { dealName, startDate, endDate, discountPercentage } = req.body;

        // Kiểm tra đầu vào
        if (!dealName || !startDate || !endDate || !discountPercentage) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Tạo daily deal
        const dailyDealId = await createDailyDeal(dealName, startDate, endDate, discountPercentage);
        return res.status(201).json({ message: 'Daily deal created successfully', dailyDealId });
    } catch (error) {
        console.error('Error creating daily deal:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Endpoint để liên kết sản phẩm với daily deal
router.post('/daily-deal/:dailyDealId/product', authenticateToken,  async (req, res) => {
    try {
        const dailyDealId = req.params.dailyDealId;
        const { productId } = req.body;

        // Kiểm tra đầu vào
        if (!productId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Liên kết sản phẩm với daily deal
        await addProductToDailyDeal(dailyDealId, productId);
        return res.status(201).json({ message: 'Product added to daily deal successfully' });
    } catch (error) {
        console.error('Error adding product to daily deal:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

    // Function to generate a random category_id
    function generateCategoryId() {
        // Generate a random number between 1000 and 9999
        return Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
    }

    // Function to check if a category_id already exists
    function categoryExists(categoryId) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM Category WHERE category_id = ?';
            connection.query(query, [categoryId], (error, results) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(results.length > 0);
            });
        });
    }

    // Route to add a new category
    router.post('/addCategory', authenticateToken, isSeller, async (req, res) => {
        const name = req.body.Category_name;
        console.log(name);
        // let categoryId = generateCategoryId(); // Generate a random category_id

        // Loop until a unique category_id is generated
        // while (await categoryExists(categoryId)) {
        //     categoryId = generateCategoryId();
        // }

        // Thực hiện thêm category vào database với category_id ngẫu nhiên
        const query = 'INSERT INTO Category (category_name, created_at) VALUES (?, NOW())';
        connection.query(query, [name], (error, results) => {
            if (error) {
                console.error('Error executing query:', error);
                res.status(500).json({ error: 'Internal server error add category' });
                return;
            }
            res.status(201).json({ message: 'Category added successfully' });
        });
    });


    // Middleware để xác thực mã bearer token
    function authenticateToken(req, res, next) {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
            console.log(token);
            try {
                if (token) {
                    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, { complete: true });
                    // Tìm kiếm người dùng trong cơ sở dữ liệu bằng ID được giải mã từ token
                    const userId = decoded.payload.id;
                    console.log(userId)
                    const query = 'SELECT * FROM e_user WHERE user_id = ?';
                    connection.query(query, [userId], (error, results) => {
                        if (error) {
                            console.error("Error executing query:", error);
                            res.status(500).json({ error: 'Internal server error' });
                            return;
                        }
                        if (results.length === 0) {
                            throw new Error("User not found");
                        }
                        // Lấy thông tin người dùng từ kết quả truy vấn
                        const user = results[0];
                        // Gán thông tin người dùng vào request để sử dụng ở middleware khác
                        req.user = user;
                        console.log("userid", user.User_id);
                        next();
                    });
                }
            } catch (error) {
                console.error("Not authorized: token expired or invalid", error);
                res.status(401).json({ error: 'Not authorized: token expired or invalid' });
            }
        } else {
            res.status(401).json({ error: 'No token attached to header' });
        }
    }
    //     function generateToken(userId) {
    //     const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' }); // expiresIn: '1h' means the token expires in 1 hour
    //     return token;
    // }

    return router;
};


