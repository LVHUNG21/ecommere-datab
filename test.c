-- Thêm ràng buộc khóa ngoại cho bảng Buyer
ALTER TABLE Buyer
ADD CONSTRAINT fk_Buyer_User
FOREIGN KEY (User_id) REFERENCES e_user(User_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Seller
ALTER TABLE Seller
ADD CONSTRAINT fk_Seller_User
FOREIGN KEY (User_id) REFERENCES e_user(user_ID)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng ContactInfo
ALTER TABLE ContactInfo
ADD CONSTRAINT fk_ContactInfo_User
FOREIGN KEY (user_id) REFERENCES e_user(user_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng ShoppingCart
ALTER TABLE ShoppingCart
ADD CONSTRAINT fk_ShoppingCart_Buyer
FOREIGN KEY (buyer_id) REFERENCES Buyer(Buyer_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng CartItem
ALTER TABLE CartItem
ADD CONSTRAINT fk_CartItem_Product
FOREIGN KEY (PRODUCT_ID) REFERENCES Product(Product_id)
ON DELETE CASCADE;

ALTER TABLE CartItem
ADD CONSTRAINT fk_CartItem_ShoppingCart
FOREIGN KEY (CART_ID) REFERENCES ShoppingCart(cart_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Product
ALTER TABLE Product
ADD CONSTRAINT fk_Product_Category
FOREIGN KEY (Category_id) REFERENCES Category(Category_id)
ON DELETE CASCADE;

ALTER TABLE Product
ADD CONSTRAINT fk_Product_Seller
FOREIGN KEY (Seller_id) REFERENCES Seller(Seller_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Wishlist
ALTER TABLE Wishlist
ADD CONSTRAINT fk_Wishlist_Buyer
FOREIGN KEY (Buyer_id) REFERENCES Buyer(Buyer_id)
ON DELETE CASCADE;

ALTER TABLE Wishlist
ADD CONSTRAINT fk_Wishlist_Product
FOREIGN KEY (Product_id) REFERENCES Product(Product_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Review
ALTER TABLE Review
ADD CONSTRAINT fk_Review_Product
FOREIGN KEY (Product_id) REFERENCES Product(Product_id)
ON DELETE CASCADE;

ALTER TABLE Review
ADD CONSTRAINT fk_Review_Buyer
FOREIGN KEY (Buyer_id) REFERENCES Buyer(Buyer_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Order
ALTER TABLE e_order
ADD CONSTRAINT fk_Order_Buyer
FOREIGN KEY (Buyer_id) REFERENCES Buyer(Buyer_id)
ON DELETE CASCADE;

ALTER TABLE e_order
ADD CONSTRAINT fk_Order_Discount
FOREIGN KEY (Discount_id) REFERENCES Discount(Discount_id)
ON DELETE CASCADE;

ALTER TABLE e_order
ADD CONSTRAINT fk_Order_OrderStatus
FOREIGN KEY (Order_status_id) REFERENCES OrderStatus(Orderstatus_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng OrderItem
ALTER TABLE OrderItem
ADD CONSTRAINT fk_OrderItem_Order
FOREIGN KEY (Order_id) REFERENCES e_order(Order_id)
ON DELETE CASCADE;

ALTER TABLE OrderItem
ADD CONSTRAINT fk_OrderItem_Product
FOREIGN KEY (Product_id) REFERENCES Product(Product_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Return
ALTER TABLE return_p
ADD CONSTRAINT fk_Return_Buyer
FOREIGN KEY (Buyer_id) REFERENCES Buyer(Buyer_id)
ON DELETE CASCADE;

ALTER TABLE return_p
ADD CONSTRAINT fk_Return_Product
FOREIGN KEY (Product_id) REFERENCES Product(Product_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng DiscountDetail
ALTER TABLE DiscountDetail
ADD CONSTRAINT fk_DiscountDetail_Discount
FOREIGN KEY (Discount_id) REFERENCES Discount(Discount_id)
ON DELETE CASCADE;

ALTER TABLE DiscountDetail
ADD CONSTRAINT fk_DiscountDetail_Order
FOREIGN KEY (Order_id) REFERENCES e_order(Order_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Payment
ALTER TABLE Payment
ADD CONSTRAINT fk_Payment_Order
FOREIGN KEY (Order_id) REFERENCES e_order(Order_id)
ON DELETE CASCADE;

ALTER TABLE Payment
ADD CONSTRAINT fk_Payment_Buyer
FOREIGN KEY (Buyer_id) REFERENCES Buyer(Buyer_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Shipment
ALTER TABLE Shipment
ADD CONSTRAINT fk_Shipment_Order
FOREIGN KEY (Order_id) REFERENCES e_order(Order_id)
ON DELETE CASCADE;

ALTER TABLE Shipment
ADD CONSTRAINT fk_Shipment_Product
FOREIGN KEY (Product_id) REFERENCES Product(Product_id)
ON DELETE CASCADE;

ALTER TABLE Shipment
ADD CONSTRAINT fk_Shipment_Invoice
FOREIGN KEY (Invoice_id) REFERENCES Invoice(Invoice_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Carrier
ALTER TABLE Carrier
ADD CONSTRAINT fk_Carrier_Shipment
FOREIGN KEY (Shipment_id) REFERENCES Shipment(Shipment_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Invoice
ALTER TABLE Invoice
ADD CONSTRAINT fk_Invoice_Order
FOREIGN KEY (Order_id) REFERENCES e_order(Order_id)
ON DELETE CASCADE;

ALTER TABLE Invoice
ADD CONSTRAINT fk_Invoice_InvoiceStatus
FOREIGN KEY (Invoice_status_id) REFERENCES Invoice_status(Invoice_status_id)
ON DELETE CASCADE;

// Endpoint POST để tạo người dùng mới, mặc định là Buyer
app.post('/users', (req, res) => {
    const { username, email, password, fullname } = req.body;
    const query = 'INSERT INTO E_User (username, email, password, fullname) VALUES (?, ?, ?, ?)';
    connection.query(query, [username, email, password, fullname], (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.status(201).json({ message: 'User created successfully' });
    });
});

// Endpoint PUT để cập nhật trạng thái người dùng từ Buyer sang Seller
app.put('/users/:id', (req, res) => {
    const userId = req.params.id;
    const query = 'UPDATE Buyer SET User_id = NULL WHERE User_id = ?; UPDATE Seller SET User_id = ? WHERE Seller_id = ?';
    connection.query(query, [userId, userId], (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.status(200).json({ message: 'User status updated successfully' });
    });
});


-- Bảng User
CREATE TABLE E_User (
    User_id INT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    fullname VARCHAR(255),
    created_at DATE NOT NULL
);

-- Bảng Buyer
CREATE TABLE Buyer (
    Buyer_id INT PRIMARY KEY,
    User_id INT NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Seller
CREATE TABLE Seller (
    Seller_id INT PRIMARY KEY,
    User_id INT NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng ContactInfo
CREATE TABLE ContactInfo (
    contact_id INT PRIMARY KEY,
    user_id INT NOT NULL,
    phone_number VARCHAR(20),
    address VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(100)
);
CREATE TABLE shippingmethod (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    maximum_order_price_amount DECIMAL(10, 2),
    maximum_order_weight DECIMAL(10, 2),
    minimum_order_price_amount DECIMAL(10, 2),
    minimum_order_weight DECIMAL(10, 2),
    price_amount DECIMAL(10, 2),
    type VARCHAR(50),
    shipping_zone_id INT,
    currency VARCHAR(3)
);


-- Bảng ShoppingCart
CREATE TABLE ShoppingCart (
    cart_id INT PRIMARY KEY,
    buyer_id INT NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng CartItem
CREATE TABLE CartItem (
    CART_ITEM_ID INT PRIMARY KEY,
    PRODUCT_ID INT NOT NULL,
    CART_ID INT NOT NULL,
    quantity INT NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Product
CREATE TABLE Product (
    Product_id INT PRIMARY KEY,
    Category_id INT NOT NULL,
    Seller_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Category
CREATE TABLE Category (
    Category_id INT PRIMARY KEY,
    Category_name VARCHAR(255) NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Wishlist
CREATE TABLE Wishlist (
    Wishlist_id INT PRIMARY KEY,
    Buyer_id INT NOT NULL,
    Product_id INT NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Review
CREATE TABLE Review (
    Review_id INT PRIMARY KEY,
    Product_id INT NOT NULL,
    Buyer_id INT NOT NULL,
    rating INT NOT NULL,
    review_text TEXT,
    created_at DATE NOT NULL
);

-- Bảng Order
CREATE TABLE E_Order (
    Order_id INT PRIMARY KEY,
    Buyer_id INT NOT NULL,
    Discount_id INT,
    Order_status_id INT,
    total_amount DECIMAL(10,2) NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng OrderItem
CREATE TABLE OrderItem (
    Order_item_id INT PRIMARY KEY,
    Order_id INT NOT NULL,
    Product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng OrderStatus
CREATE TABLE OrderStatus (
    Orderstatus_id INT PRIMARY KEY,
    Orderstatus_desc VARCHAR(255) NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Return
CREATE TABLE RETURN_P (
    Return_id INT PRIMARY KEY,
    Buyer_id INT NOT NULL,
    Product_id INT NOT NULL,
    reason TEXT,
    status VARCHAR(50),
    created_at DATE NOT NULL
);

-- Bảng Discount
CREATE TABLE Discount (
    Discount_id INT PRIMARY KEY,
    Discount_name VARCHAR(255) NOT NULL,
    discount_percentage DECIMAL(5,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng DiscountDetail
CREATE TABLE DiscountDetail (
    Discount_detail_id INT PRIMARY KEY,
    Discount_id INT NOT NULL,
    Order_id INT NOT NULL,
    discounted_amount DECIMAL(10,2) NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Payment
CREATE TABLE Payment (
    Payment_id INT PRIMARY KEY,
    Order_id INT NOT NULL,
    Buyer_id INT NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    payment_status VARCHAR(100) NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Shipment
CREATE TABLE Shipment (
    Shipment_id INT PRIMARY KEY,
    Order_id INT NOT NULL,
    Product_id INT NOT NULL,
    Invoice_id INT,
    shipping_address TEXT,
    shipping_status VARCHAR(100) NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Carrier
CREATE TABLE Carrier (
    Carrier_id INT PRIMARY KEY,
    Shipment_id INT NOT NULL,
    carrier_name VARCHAR(255) NOT NULL,
    tracking_number VARCHAR(100),
    created_at DATE NOT NULL
);

-- Bảng Invoice
CREATE TABLE Invoice (
    Invoice_id INT PRIMARY KEY,
    Order_id INT NOT NULL,
    Invoice_status_id INT,
    total_amount DECIMAL(10,2) NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Invoice_status
CREATE TABLE Invoice_status (
    Invoice_status_id INT PRIMARY KEY,
    Invoice_status_desc VARCHAR(255) NOT NULL,
    created_at DATE NOT NULL
);


























-- Bảng E_User
CREATE TABLE E_User (
    User_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    fullname VARCHAR(255),
    created_at DATE NOT NULL
);

-- Bảng Buyer
CREATE TABLE Buyer (
    Buyer_id INT AUTO_INCREMENT PRIMARY KEY,
    User_id INT NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Seller
CREATE TABLE Seller (
    Seller_id INT AUTO_INCREMENT PRIMARY KEY,
    User_id INT NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng ContactInfo
CREATE TABLE ContactInfo (
    contact_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    phone_number VARCHAR(20),
    address VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(100)
);

-- Bảng ShoppingCart
CREATE TABLE ShoppingCart (
    cart_id INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id INT NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng CartItem
CREATE TABLE CartItem (
    CART_ITEM_ID INT AUTO_INCREMENT PRIMARY KEY,
    PRODUCT_ID INT NOT NULL,
    CART_ID INT NOT NULL,
    quantity INT NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Product
CREATE TABLE Product (
    Product_id INT AUTO_INCREMENT PRIMARY KEY,
    Category_id INT NOT NULL,
    Seller_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Category
CREATE TABLE Category (
    Category_id INT AUTO_INCREMENT PRIMARY KEY,
    Category_name VARCHAR(255) NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Wishlist
CREATE TABLE Wishlist (
    Wishlist_id INT AUTO_INCREMENT PRIMARY KEY,
    Buyer_id INT NOT NULL,
    Product_id INT NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Review
CREATE TABLE Review (
    Review_id INT AUTO_INCREMENT PRIMARY KEY,
    Product_id INT NOT NULL,
    Buyer_id INT NOT NULL,
    rating INT NOT NULL,
    review_text TEXT,
    created_at DATE NOT NULL
);

-- Bảng Order
CREATE TABLE E_Order (
    Order_id INT AUTO_INCREMENT PRIMARY KEY,
    Buyer_id INT NOT NULL,
    Discount_id INT,
    Order_status_id INT,
    total_amount DECIMAL(10,2) NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng OrderItem
CREATE TABLE OrderItem (
    Order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    Order_id INT NOT NULL,
    Product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng OrderStatus
CREATE TABLE OrderStatus (
    Orderstatus_id INT AUTO_INCREMENT PRIMARY KEY,
    Orderstatus_desc VARCHAR(255) NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Return
CREATE TABLE RETURN_P (
    Return_id INT AUTO_INCREMENT PRIMARY KEY,
    Buyer_id INT NOT NULL,
    Product_id INT NOT NULL,
    reason TEXT,
    status VARCHAR(50),
    created_at DATE NOT NULL
);

-- Bảng Discount
CREATE TABLE Discount (
    Discount_id INT AUTO_INCREMENT PRIMARY KEY,
    Discount_name VARCHAR(255) NOT NULL,
    discount_percentage DECIMAL(5,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng DiscountDetail
CREATE TABLE DiscountDetail (
    Discount_detail_id INT AUTO_INCREMENT PRIMARY KEY,
    Discount_id INT NOT NULL,
    Order_id INT NOT NULL,
    discounted_amount DECIMAL(10,2) NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Payment
CREATE TABLE Payment (
    Payment_id INT AUTO_INCREMENT PRIMARY KEY,
    Order_id INT NOT NULL,
    Buyer_id INT NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    payment_status VARCHAR(100) NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Shipment
CREATE TABLE Shipment (
    Shipment_id INT AUTO_INCREMENT PRIMARY KEY,
    Order_id INT NOT NULL,
    Product_id INT NOT NULL,
    Invoice_id INT,
    shipping_address TEXT,
    shipping_status VARCHAR(100) NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Carrier
CREATE TABLE Carrier (
    Carrier_id INT AUTO_INCREMENT PRIMARY KEY,
    Shipment_id INT NOT NULL,
    carrier_name VARCHAR(255) NOT NULL,
    tracking_number VARCHAR(100),
    created_at DATE NOT NULL
);

-- Bảng Invoice
CREATE TABLE Invoice (
    Invoice_id INT AUTO_INCREMENT PRIMARY KEY,
    Order_id INT NOT NULL,
    Invoice_status_id INT,
    total_amount DECIMAL(10,2) NOT NULL,
    created_at DATE NOT NULL
);

-- Bảng Invoice_status
CREATE TABLE Invoice_status (
    Invoice_status_id INT AUTO_INCREMENT PRIMARY KEY,
    Invoice_status_desc VARCHAR(255) NOT NULL,
    created_at DATE NOT NULL
);



-- Thêm ràng buộc khóa ngoại cho bảng Buyer
ALTER TABLE Buyer
ADD CONSTRAINT fk_Buyer_User
FOREIGN KEY (User_id) REFERENCES e_user(User_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Seller
ALTER TABLE Seller
ADD CONSTRAINT fk_Seller_User
FOREIGN KEY (User_id) REFERENCES e_user(user_ID)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng ContactInfo
ALTER TABLE ContactInfo
ADD CONSTRAINT fk_ContactInfo_User
FOREIGN KEY (user_id) REFERENCES e_user(user_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng ShoppingCart
ALTER TABLE ShoppingCart
ADD CONSTRAINT fk_ShoppingCart_Buyer
FOREIGN KEY (buyer_id) REFERENCES Buyer(Buyer_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng CartItem
ALTER TABLE CartItem
ADD CONSTRAINT fk_CartItem_Product
FOREIGN KEY (PRODUCT_ID) REFERENCES Product(Product_id)
ON DELETE CASCADE;

ALTER TABLE CartItem
ADD CONSTRAINT fk_CartItem_ShoppingCart
FOREIGN KEY (CART_ID) REFERENCES ShoppingCart(cart_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Product
ALTER TABLE Product
ADD CONSTRAINT fk_Product_Category
FOREIGN KEY (Category_id) REFERENCES Category(Category_id)
ON DELETE CASCADE;

ALTER TABLE Product
ADD CONSTRAINT fk_Product_Seller
FOREIGN KEY (Seller_id) REFERENCES Seller(Seller_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Wishlist
ALTER TABLE Wishlist
ADD CONSTRAINT fk_Wishlist_Buyer
FOREIGN KEY (Buyer_id) REFERENCES Buyer(Buyer_id)
ON DELETE CASCADE;

ALTER TABLE Wishlist
ADD CONSTRAINT fk_Wishlist_Product
FOREIGN KEY (Product_id) REFERENCES Product(Product_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Review
ALTER TABLE Review
ADD CONSTRAINT fk_Review_Product
FOREIGN KEY (Product_id) REFERENCES Product(Product_id)
ON DELETE CASCADE;

ALTER TABLE Review
ADD CONSTRAINT fk_Review_Buyer
FOREIGN KEY (Buyer_id) REFERENCES Buyer(Buyer_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Order
ALTER TABLE e_order
ADD CONSTRAINT fk_Order_Buyer
FOREIGN KEY (Buyer_id) REFERENCES Buyer(Buyer_id)
ON DELETE CASCADE;

ALTER TABLE e_order
ADD CONSTRAINT fk_Order_Discount
FOREIGN KEY (Discount_id) REFERENCES Discount(Discount_id)
ON DELETE CASCADE;

ALTER TABLE e_order
ADD CONSTRAINT fk_Order_OrderStatus
FOREIGN KEY (Order_status_id) REFERENCES OrderStatus(Orderstatus_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng OrderItem
ALTER TABLE OrderItem
ADD CONSTRAINT fk_OrderItem_Order
FOREIGN KEY (Order_id) REFERENCES e_order(Order_id)
ON DELETE CASCADE;

ALTER TABLE OrderItem
ADD CONSTRAINT fk_OrderItem_Product
FOREIGN KEY (Product_id) REFERENCES Product(Product_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Return
ALTER TABLE return_p
ADD CONSTRAINT fk_Return_Buyer
FOREIGN KEY (Buyer_id) REFERENCES Buyer(Buyer_id)
ON DELETE CASCADE;

ALTER TABLE return_p
ADD CONSTRAINT fk_Return_Product
FOREIGN KEY (Product_id) REFERENCES Product(Product_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng DiscountDetail
ALTER TABLE DiscountDetail
ADD CONSTRAINT fk_DiscountDetail_Discount
FOREIGN KEY (Discount_id) REFERENCES Discount(Discount_id)
ON DELETE CASCADE;

ALTER TABLE DiscountDetail
ADD CONSTRAINT fk_DiscountDetail_Order
FOREIGN KEY (Order_id) REFERENCES e_order(Order_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Payment
ALTER TABLE Payment
ADD CONSTRAINT fk_Payment_Order
FOREIGN KEY (Order_id) REFERENCES e_order(Order_id)
ON DELETE CASCADE;

ALTER TABLE Payment
ADD CONSTRAINT fk_Payment_Buyer
FOREIGN KEY (Buyer_id) REFERENCES Buyer(Buyer_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Shipment
ALTER TABLE Shipment
ADD CONSTRAINT fk_Shipment_Order
FOREIGN KEY (Order_id) REFERENCES e_order(Order_id)
ON DELETE CASCADE;

ALTER TABLE Shipment
ADD CONSTRAINT fk_Shipment_Product
FOREIGN KEY (Product_id) REFERENCES Product(Product_id)
ON DELETE CASCADE;

ALTER TABLE Shipment
ADD CONSTRAINT fk_Shipment_Invoice
FOREIGN KEY (Invoice_id) REFERENCES Invoice(Invoice_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Carrier
ALTER TABLE Carrier
ADD CONSTRAINT fk_Carrier_Shipment
FOREIGN KEY (Shipment_id) REFERENCES Shipment(Shipment_id)
ON DELETE CASCADE;

-- Thêm ràng buộc khóa ngoại cho bảng Invoice
ALTER TABLE Invoice
ADD CONSTRAINT fk_Invoice_Order
FOREIGN KEY (Order_id) REFERENCES e_order(Order_id)
ON DELETE CASCADE;

ALTER TABLE Invoice
ADD CONSTRAINT fk_Invoice_InvoiceStatus
FOREIGN KEY (Invoice_status_id) REFERENCES Invoice_status(Invoice_status_id)
ON DELETE CASCADE;
ALTER TABLE E_User
ADD COLUMN userType VARCHAR(50) NOT NULL DEFAULT 'normal';
ALTER TABLE E_User
ADD COLUMN token VARCHAR(255);

ALTER TABLE ShoppingCart
ADD COLUMN total_price DECIMAL(10, 2) NOT NULL DEFAULT 0;
// UPDATE ShoppingCart
// SET total_price = (
//     SELECT SUM(Product.price * CartItem.quantity) AS total
//     FROM CartItem
//     JOIN Product ON CartItem.product_id = Product.product_id
//     WHERE CartItem.cart_id = ShoppingCart.cart_id
// )
// WHERE ShoppingCart.cart_id = <cart_id>;

ALTER TABLE cart_item ADD COLUMN total_price DECIMAL(10, 2);

SELECT cartitem.product_id, cartitem.quantity, product.price * cartitem.quantity AS total_price
FROM cartitem
JOIN product ON cartitem.product_id = product.product_id;


CREATE TRIGGER update_total_price
AFTER INSERT ON cartitem
FOR EACH ROW
BEGIN
    DECLARE item_price DECIMAL(10, 2);
    SELECT price * NEW.quantity INTO item_price FROM product WHERE product_id = NEW.product_id;
    UPDATE cartitem SET total_price_item = item_price WHERE cart_item_id = NEW.cart_item_id;
END;



DELIMITER //

CREATE TRIGGER update_shopping_cart_total_price
AFTER update ON cartitem
FOR EACH ROW
BEGIN
    DECLARE cart_total DECIMAL(10, 2);
    
    -- Tính toán tổng giá của các mặt hàng trong giỏ hàng mới
    SELECT SUM(total_price_item) INTO cart_total FROM cartitem WHERE cart_id = NEW.cart_id;
    
    -- Cập nhật total_price của shopping cart
    UPDATE shoppingcart SET total_price = cart_total WHERE cart_id = NEW.cart_id;
END;
//

DELIMITER ;
DELIMITER //

CREATE TRIGGER update_total_price_after_delete
AFTER DELETE ON cartitem
FOR EACH ROW
BEGIN
    DECLARE cart_id_temp INT;
    DECLARE total_price_temp DECIMAL(10, 2);

    -- Lấy cart_id của cartItem bị xóa
    SET cart_id_temp = OLD.cart_id;

    -- Tính lại total_price cho shoppingcart
    SELECT SUM(total_price_item) INTO total_price_temp
    FROM cartitem
    WHERE cart_id = cart_id_temp;

    -- Cập nhật total_price trong shoppingcart
    UPDATE shoppingcart
    SET total_price = total_price_temp
    WHERE cart_id = cart_id_temp;
END;
//

DELIMITER ;


DELIMITER //

CREATE TRIGGER update_total_price_after_delete
AFTER DELETE ON cartitem
FOR EACH ROW
BEGIN
    DECLARE cart_id_temp INT;
    DECLARE total_price_temp DECIMAL(10, 2);

    -- Lấy cart_id của cartItem bị xóa
    SET cart_id_temp = OLD.cart_id;

    -- Tính lại total_price cho shoppingcart
    SELECT IFNULL(SUM(total_price_item), 0) INTO total_price_temp
    FROM cartitem
    WHERE cart_id = cart_id_temp;

    -- Cập nhật total_price trong shoppingcart
    UPDATE shoppingcart
    SET total_price = total_price_temp
    WHERE cart_id = cart_id_temp;
END;
//

DELIMITER ;

-- Thêm các bản ghi cho bảng OrderStatus
INSERT INTO OrderStatus (Orderstatus_desc, created_at) VALUES ('Pending', NOW());
INSERT INTO OrderStatus (Orderstatus_desc, created_at) VALUES ('Processing', NOW());
INSERT INTO OrderStatus (Orderstatus_desc, created_at) VALUES ('Shipped', NOW());
INSERT INTO OrderStatus (Orderstatus_desc, created_at) VALUES ('Delivered', NOW());
INSERT INTO OrderStatus (Orderstatus_desc, created_at) VALUES ('Cancelled', NOW());

ALTER TABLE `shipment` ADD COLUMN `carrier_id` INT;

ALTER TABLE `shipment` ADD CONSTRAINT `fk_order_carrier` FOREIGN KEY (`carrier_id`) REFERENCES `carrier` (`carrier_id`);

ALTER TABLE `carrier` DROP FOREIGN KEY `fk_Carrier_Shipment`;
ALTER TABLE `carrier` DROP COLUMN `shipment_id`;


INSERT INTO `carrier` (`carrier_name`, `tracking_number`, `created_at`) VALUES
('UPS', '123456789', '2024-05-13'),
('FedEx', '987654321', '2024-05-12'),
('DHL', '456789123', '2024-05-11');

CREATE TABLE DailyDeal (
    DailyDeal_id INT AUTO_INCREMENT PRIMARY KEY,
    Start_date DATE NOT NULL,
    End_date DATE NOT NULL,
    Discount_percent DECIMAL(5,2) NOT NULL
);
CREATE TABLE ProductDailyDeal (
    ProductDailyDeal_id INT AUTO_INCREMENT PRIMARY KEY,
    Product_id INT,
    DailyDeal_id INT,
    FOREIGN KEY (Product_id) REFERENCES Product(Product_id),
    FOREIGN KEY (DailyDeal_id) REFERENCES DailyDeal(DailyDeal_id)
);

ALTER TABLE DailyDeal
ADD CONSTRAINT FK_Product_DailyDeal FOREIGN KEY (Product_id)
REFERENCES Product(product_id);



Lấy buyer_id từ user_id.
Lấy thông tin giỏ hàng của người dùng.
Kiểm tra số lượng tồn kho của từng sản phẩm trong giỏ hàng.
Tính tổng số tiền của đơn hàng.
Tạo đơn hàng (E_Order).
Tạo các mục đơn hàng (OrderItem).
Tạo thanh toán (Payment).
Tạo shipment (Shipment).
Cập nhật số lượng hàng tồn kho (stock_quantity) trong bảng Product.
Xóa giỏ hàng sau khi thanh toán thành công.
Cập nhật trạng thái của đơn hàng thành 'Processing' (đang xử lý).
Trả về thông báo 'Checkout successful' khi hoàn thành

CREATE TABLE DiscountConditions (
    Condition_id INT AUTO_INCREMENT PRIMARY KEY,
    Discount_id INT NOT NULL,
    Condition_name VARCHAR(255) NOT NULL,
    Condition_value VARCHAR(255) NOT NULL,
    created_at DATE NOT NULL,
    FOREIGN KEY (Discount_id) REFERENCES Discount(Discount_id) ON DELETE CASCADE
);
ALTER TABLE Discount ADD COLUMN min_order_value DECIMAL(10,2) DEFAULT NULL;

INSERT INTO Discount (Discount_name, discount_percentage, start_date, end_date, created_at, min_order_value)
VALUES ('Spring Sale', 10.00, '2024-05-01', '2024-05-31', CURDATE(), 50.00);

INSERT INTO Discount (Discount_name, discount_percentage, start_date, end_date, created_at, min_order_value)
VALUES ('Summer Blast', 15.00, '2024-06-01', '2024-06-30', CURDATE(), 75.00);

INSERT INTO Discount (Discount_name, discount_percentage, start_date, end_date, created_at, min_order_value)
VALUES ('Back to School', 20.00, '2024-08-01', '2024-08-31', CURDATE(), NULL);

INSERT INTO Discount (Discount_name, discount_percentage, start_date, end_date, created_at, min_order_value)
VALUES ('Black Friday', 25.00, '2024-11-25', '2024-11-30', CURDATE(), 100.00);

INSERT INTO Discount (Discount_name, discount_percentage, start_date, end_date, created_at, min_order_value)
VALUES ('Cyber Monday', 30.00, '2024-12-01', '2024-12-05', CURDATE(), 150.00);

CREATE TABLE daily_deal (
    daily_deal_id INT AUTO_INCREMENT PRIMARY KEY,
    deal_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    discount_percentage DECIMAL(5, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE daily_deal_product (
    daily_deal_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (daily_deal_id, product_id),
    FOREIGN KEY (daily_deal_id) REFERENCES daily_deal(daily_deal_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE
);
ALTER TABLE productdailydeal
ADD COLUMN valid_until DATE DEFAULT '2023-01-01';
CREATE TABLE discount_voucher (
    voucher_id INT AUTO_INCREMENT PRIMARY KEY,
    voucher_code VARCHAR(255) NOT NULL,
    discount_percentage DECIMAL(5,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    apply_once_per_order BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE discountVoucherProduct (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voucher_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (voucher_id) REFERENCES discount_voucher(voucher_id),
    FOREIGN KEY (product_id) REFERENCES Product(Product_id)
);
CREATE TABLE discountVoucherCategory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    voucher_id INT NOT NULL,
    category_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (voucher_id) REFERENCES discount_voucher(voucher_id),
    FOREIGN KEY (category_id) REFERENCES Category(category_id)
);
ALTER TABLE `Order` ADD COLUMN voucher_id INT NULL, ADD FOREIGN KEY (voucher_id) REFERENCES discount_voucher(voucher_id);
CREATE TABLE discount_voucherbuyer (
    voucher_buyer_id INT AUTO_INCREMENT PRIMARY KEY,
    voucher_id INT NOT NULL,
    buyer_id INT NOT NULL,
    used_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (voucher_id) REFERENCES discount_voucher(voucher_id),
    FOREIGN KEY (buyer_id) REFERENCES buyer(buyer_id)
);
CREATE TABLE discount_sale (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE discount_sale_product (
    sale_product_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES discount_sale(sale_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO discount_voucher (voucher_id, voucher_code, discount_percentage, start_date, end_date, apply_once_per_order, created_at, updated_at, type, apply_once_per_customer)
VALUES 
    (1, 'VOUCHER001', 10, '2024-06-01', '2024-06-30', 1, NOW(), NOW(), 'product', 1),
    (2, 'VOUCHER002', 20, '2024-06-01', '2024-06-30', 0, NOW(), NOW(), 'category', 0),
    (3, 'VOUCHER003', 15, '2024-06-01', '2024-06-30', 1, NOW(), NOW(), 'general', 1);

CREATE TABLE WarehouseShippingZone (
    id INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id INT,
    shipping_zone_id INT,
    FOREIGN KEY (warehouse_id) REFERENCES Warehouse(id) ON DELETE CASCADE,
    FOREIGN KEY (shipping_zone_id) REFERENCES ShippingZone(id) ON DELETE CASCADE
);
ALTER TABLE Shipment
ADD COLUMN shipping_zone_id INT,
ADD FOREIGN KEY (shipping_zone_id) REFERENCES ShippingZone(id);
ALTER TABLE shippingmethod
ADD CONSTRAINT fk_shipping_zone
FOREIGN KEY (shipping_zone_id) REFERENCES shippingzone(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE TABLE shippingmethod (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    maximum_order_price_amount DECIMAL(10, 2),
    maximum_order_weight DECIMAL(10, 2),
    minimum_order_price_amount DECIMAL(10, 2),
    minimum_order_weight DECIMAL(10, 2),
    price_amount DECIMAL(10, 2),
    type VARCHAR(50),
    shipping_zone_id INT,
    currency VARCHAR(3)
);
-- Phương thức vận chuyển cho khu vực Hà Nội
INSERT INTO shippingmethod (name, maximum_order_price_amount, maximum_order_weight, minimum_order_price_amount, minimum_order_weight, price_amount, type, shipping_zone_id, currency) VALUES
('Standard Shipping - Hà Nội', 500000, 10, 0, 0, 20000, 'Standard', 1, 'VND'),
('Express Shipping - Hà Nội', 1000000, 20, 0, 0, 50000, 'Express', 1, 'VND'),
('Free Shipping - Hà Nội', NULL, NULL, 1000000, 5, 0, 'Free', 1, 'VND');

-- Phương thức vận chuyển cho khu vực TP. Hồ Chí Minh
INSERT INTO shippingmethod (name, maximum_order_price_amount, maximum_order_weight, minimum_order_price_amount, minimum_order_weight, price_amount, type, shipping_zone_id, currency) VALUES
('Standard Shipping - TP. Hồ Chí Minh', 500000, 10, 0, 0, 25000, 'Standard', 2, 'VND'),
('Express Shipping - TP. Hồ Chí Minh', 1000000, 20, 0, 0, 60000, 'Express', 2, 'VND'),
('Free Shipping - TP. Hồ Chí Minh', NULL, NULL, 1500000, 5, 0, 'Free', 2, 'VND');

-- Phương thức vận chuyển cho các tỉnh thành khác
INSERT INTO shippingmethod (name, maximum_order_price_amount, maximum_order_weight, minimum_order_price_amount, minimum_order_weight, price_amount, type, shipping_zone_id, currency) VALUES
('Standard Shipping - Đà Nẵng', 500000, 10, 0, 0, 25000, 'Standard', 3, 'VND'),
('Express Shipping - Đà Nẵng', 1000000, 20, 0, 0, 60000, 'Express', 3, 'VND'),
('Free Shipping - Đà Nẵng', NULL, NULL, 1500000, 5, 0, 'Free', 3, 'VND'),

('Standard Shipping - Hải Phòng', 500000, 10, 0, 0, 25000, 'Standard', 4, 'VND'),
('Express Shipping - Hải Phòng', 1000000, 20, 0, 0, 60000, 'Express', 4, 'VND'),
('Free Shipping - Hải Phòng', NULL, NULL, 1500000, 5, 0, 'Free', 4, 'VND'),

-- Tiếp tục thêm các phương thức cho các tỉnh thành khác...
CREATE TABLE account_address (
    id INT PRIMARY KEY,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    company_name VARCHAR(255),
    street_address_1 VARCHAR(255),
    street_address_2 VARCHAR(255),
    city VARCHAR(255),
    postal_code VARCHAR(255),
    country VARCHAR(255),
    country_area VARCHAR(255),
    phone VARCHAR(255),
    city_area VARCHAR(255)
);CREATE TABLE account_address (
    id INT PRIMARY KEY,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    company_name VARCHAR(255),
    street_address_1 VARCHAR(255),
    street_address_2 VARCHAR(255),
    city VARCHAR(255),
    postal_code VARCHAR(255),
    country VARCHAR(255),
    country_area VARCHAR(255),
    phone VARCHAR(255),
    city_area VARCHAR(255)
);





DELIMITER $$

CREATE TRIGGER before_insert_user_address
BEFORE INSERT ON user_address
FOR EACH ROW
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE user_address
        SET is_default = FALSE
        WHERE user_id = NEW.user_id AND is_default = TRUE;
    END IF;
END $$

CREATE TRIGGER before_update_user_address
BEFORE UPDATE ON user_address
FOR EACH ROW
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE user_address
        SET is_default = FALSE
        WHERE user_id = NEW.user_id AND is_default = TRUE AND id != NEW.id;
    END IF;
END $$

DELIMITER ;


DELIMITER $$

CREATE TRIGGER before_insert_shipping_method
BEFORE INSERT ON shipping_method
FOR EACH ROW
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE shipping_method
        SET is_default = FALSE
        WHERE is_default = TRUE;
    END IF;
END $$

CREATE TRIGGER before_update_shipping_method
BEFORE UPDATE ON shipping_method
FOR EACH ROW
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE shipping_method
        SET is_default = FALSE
        WHERE is_default = TRUE AND id != NEW.id;
    END IF;
END $$

DELIMITER ;
ALTER TABLE `e_order`
ADD COLUMN `shippingaddress_id` INT,
ADD CONSTRAINT `fk_order_shippingaddress`
    FOREIGN KEY (`shippingaddress_id`) 
    REFERENCES `address` (`id`);






    CREATE TABLE product_attribute (
    id INT PRIMARY KEY,
    slug VARCHAR(255),
    name VARCHAR(255),
    metadata TEXT,
    private_metadata TEXT,
    input_type VARCHAR(255),
    available_in_grid BOOLEAN,
    visible_in_storefront BOOLEAN,
    filterable_in_storefront BOOLEAN,
    value_required BOOLEAN,
    storefront_search_position INT,
    is_variant_only BOOLEAN
);

CREATE TABLE product_attribute_variant (
    id INT PRIMARY KEY,
    attribute_id INT,
    product_type_id INT,
    sort_order INT
);
CREATE TABLE product_attribute_value (
    id INT PRIMARY KEY,
    name VARCHAR(255),
    attribute_id INT,
    slug VARCHAR(255),
    sort_order INT,
    value TEXT
);
CREATE TABLE product_attribute_product (
    id INT PRIMARY KEY,
    attribute_id INT,
    product_type_id INT,
    sort_order INT
);

CREATE TABLE product_producttype (
    id INT PRIMARY KEY,
    name VARCHAR(255),
    has_variants BOOLEAN,
    is_shipping_required BOOLEAN,
    weight DECIMAL(10,2),
    metadata TEXT,
    private_metadata TEXT,
    slug VARCHAR(255)
);



CREATE TABLE product_producttype (
    id INT PRIMARY KEY,
    name VARCHAR(255),
    has_variants BOOLEAN
);

ALTER TABLE product
ADD COLUMN product_type_id INT,
ADD FOREIGN KEY (product_type_id) REFERENCES product_producttype(id);


CREATE TABLE product_attribute (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nameAtribbute VARCHAR(255))

-- Bảng product_attributevalue liên kết với product_attribute
CREATE TABLE product_attributevalue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nameValue VARCHAR(255),
    attribute_id INT,
    attribute_value text,
    FOREIGN KEY (attribute_id) REFERENCES product_attribute(id) ON DELETE CASCADE
);

-- Bảng product_assignedvariantattribute
CREATE TABLE product_assignedvariantattribute (
    id INT AUTO_INCREMENT PRIMARY KEY,
    variant_id INT,
    attribute_id INT,
    attributevalue_id INT,
    FOREIGN KEY (variant_id) REFERENCES product_productvariant(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_id) REFERENCES product_attribute(id) ON DELETE CASCADE,
    FOREIGN KEY (attributevalue_id) REFERENCES product_attributevalue(id) ON DELETE CASCADE
);

-- Bảng product_assignedproductattribute
CREATE TABLE product_assignedproductattribute (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,
    attribute_id INT,
    attributevalue_id INT,
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_id) REFERENCES product_attribute(id) ON DELETE CASCADE,
    FOREIGN KEY (attributevalue_id) REFERENCES product_attributevalue(id) ON DELETE CASCADE
);



-- Tạo bảng product_attributevariant
CREATE TABLE product_attributevariant (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_type_id INT,
    attribute_id INT,
    FOREIGN KEY (product_type_id) REFERENCES product_producttype(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_id) REFERENCES product_attribute(id) ON DELETE CASCADE
);
-- Tạo bảng product_attributeproduct
CREATE TABLE product_attributeproduct (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_type_id INT,
    attribute_id INT,
    FOREIGN KEY (product_type_id) REFERENCES product_producttype(id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_id) REFERENCES product_attribute(id) ON DELETE CASCADE
);
-- Tạo lại bảng product_assignproductattribute
CREATE TABLE product_assignproductattribute (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,
    attributeproduct_id INT,
    FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE,
    FOREIGN KEY (attributeproduct_id) REFERENCES product_attributeproduct(id) ON DELETE CASCADE
);
-- Tạo lại bảng product_assignproductattribute
CREATE TABLE product_assignvariantattribute (
    id INT AUTO_INCREMENT PRIMARY KEY,
    variant_id INT,
    attributevariant_id INT,
    FOREIGN KEY (variant_id) REFERENCES product_productvariant(id) ON DELETE CASCADE,
    FOREIGN KEY (attributevariant_id) REFERENCES product_attributevariant(id) ON DELETE CASCADE
);
-- Tạo bảng product_assignedproductattribute_value
CREATE TABLE product_assignedproductattribute_value (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignproductattribute_id INT,
    attributevalue_id INT,
    FOREIGN KEY (assignproductattribute_id) REFERENCES product_assignproductattribute(id) ON DELETE CASCADE,
    FOREIGN KEY (attributevalue_id) REFERENCES product_attributevalue(id) ON DELETE CASCADE
);
-- Tạo bảng product_assignedvariantattribute_value
CREATE TABLE product_assignedvariantattribute_value (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignvariantattribute_id INT,
    attributevalue_id INT,
    FOREIGN KEY (assignvariantattribute_id) REFERENCES product_assignvariantattribute(id) ON DELETE CASCADE,
    FOREIGN KEY (attributevalue_id) REFERENCES product_attributevalue(id) ON DELETE CASCADE
);

@startuml
rectangle AddProduct {
usecase "Access Product Management Interface" as UC1
usecase "Open Add Product Form" as UC2
usecase "Fill in Product Information" as UC3
usecase "Review and Confirm Information" as UC4
usecase "Publish Product" as UC5
}
:Seller: --> UC1
UC1 --> UC2
UC2 --> UC3
UC3 --> UC4
UC4 --> UC5
UC5 --> :Seller:

note right of UC3
  - Product Name
  - Product Description
  - Category
  - Price
  - Quantity
  - Product Images
  - SKU (optional)
  - Shipping Information (optional)
  - Tags (optional)
end note

note right of UC4
  - Check all information
  - Save as Draft (optional)
end note

note right of UC5
  - Submit/Publish Product
  - Success Notification
end note
@enduml


 