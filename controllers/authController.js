const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
require('dotenv').config();
const SMTPConnection = require('nodemailer/lib/smtp-connection');

const register = (connection) => (req, res) => {
    const { username, email, password, fullname } = req.body;
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' '); // Lấy thời gian hiện tại
    const userType = 'buyer'; // Mặc định là Buyer

    // Kiểm tra xem username hoặc email đã tồn tại hay chưa
    const checkUserQuery = 'SELECT * FROM E_User WHERE username = ? OR email = ?';
    connection.query(checkUserQuery, [username, email], (checkError, checkResults) => {
        if (checkError) {
            console.error('Error checking user existence:', checkError);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        if (checkResults.length > 0) {
            res.status(409).json({ error: 'Username or email already exists' });
            return;
        }

        // Thêm một người dùng mới vào bảng E_User
        const userQuery = 'INSERT INTO E_User (username, email, password, fullname, userType, created_at) VALUES (?, ?, ?, ?, ?, ?)';
        connection.query(userQuery, [username, email, password, fullname, userType, createdAt], (userError, userResults) => {
            if (userError) {
                console.error('Error executing user query:', userError);
                res.status(500).json({ error: 'Internal server error' });
                return;
            }

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
};


const login = (connection) => (req, res) => {
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

            const user = results[0];
            console.log(user.User_id);
            const token = jwt.sign({ id: user.User_id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '4h' });

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
};
const queryDatabase = (connection, query, params) => {
    return new Promise((resolve, reject) => {
        connection.query(query, params, (error, results) => {
            if (error) {
                return reject(error);
            }
            resolve(results);
        });
    });
};
const changeToSeller = async (connection, req, res) => {
    const { userId } = req.body;
    const queryUpdateUserType = 'UPDATE E_User SET userType = "seller" WHERE user_id = ?';
    const queryInsertSeller = 'INSERT INTO Seller (user_id, created_at) VALUES (?, ?)';
    const queryDeleteFromBuyer = 'DELETE FROM Buyer WHERE user_id = ?';
    const queryCheckSeller = 'SELECT * FROM Seller WHERE user_id = ?';
    const currentDate = new Date();
    try {
        const sellerResults = await queryDatabase(connection, queryCheckSeller, [userId]);
        if (sellerResults.length > 0) {
            return res.status(400).json({ error: 'User is already a seller' });
        }
        await queryDatabase(connection, queryUpdateUserType, [userId]);
        await queryDatabase(connection, queryInsertSeller, [userId, currentDate]);
        await queryDatabase(connection, queryDeleteFromBuyer, [userId]);
        res.status(200).json({ message: 'User type updated successfully' });
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Function to handle password reset request

const forgotPassword = (connection) => async (req, res) => {
    const { username,email } = req.body;

    const resetToken = jwt.sign({ username }, process.env.RESET_TOKEN_SECRET, { expiresIn: '1h' });
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

    const updateResetTokenQuery = 'UPDATE E_User SET reset_token = ?, reset_token_expires = ? WHERE username = ?';
    try {
        await queryDatabase(connection, updateResetTokenQuery, [resetToken, resetTokenExpires, username]);
        res.status(200).json({ message: 'Send new password to link reset password ', resetToken });
    } catch (error) {
        console.error('Error updating reset token:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const resetPassword = (connection) => async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const decoded = jwt.verify(token, process.env.RESET_TOKEN_SECRET);
        const { username } = decoded;
        console.log(username);
        const query = 'SELECT reset_token_expires FROM E_User WHERE reset_token = ?';
        const results = await queryDatabase(connection, query, [token]);

        console.log(results);
        if (results.length === 0 || new Date(results.reset_token_expires) < new Date()) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }
        const updatePasswordQuery = 'UPDATE E_User SET password = ? WHERE username = ?';
        await queryDatabase(connection, updatePasswordQuery, [newPassword, username]);
        const clearResetTokenQuery = 'UPDATE E_User SET reset_token = NULL, reset_token_expires = NULL WHERE username = ?';
        await queryDatabase(connection, clearResetTokenQuery, [username]);

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
const addUser = (connection) => (req, res) => {
    const { username, email, password, fullname, userType } = req.body;
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const checkUserQuery = 'SELECT * FROM E_User WHERE username = ? OR email = ?';
    connection.query(checkUserQuery, [username, email], (checkError, checkResults) => {
        if (checkError) {
            console.error('Error checking user existence:', checkError);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        if (checkResults.length > 0) {
            res.status(409).json({ error: 'Username or email already exists' });
            return;
        }

        const userQuery = 'INSERT INTO E_User (username, email, password, fullname, userType, created_at) VALUES (?, ?, ?, ?, ?, ?)';
        connection.query(userQuery, [username, email, password, fullname, userType, createdAt], (userError, userResults) => {
            if (userError) {
                console.error('Error executing user query:', userError);
                res.status(500).json({ error: 'Internal server error' });
                return;
            }
            res.status(201).json({ message: 'User account created successfully' });
        });
    });
};
const getUserTypeById = (userId) => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT userType FROM E_user WHERE User_id = ?';
        connection.query(query, [userId], (error, results) => {
            if (error) {
                reject(error);
            } else if (results.length === 0) {
                reject('User not found');
            } else {
                resolve(results[0].userType);
            }
        });
    });
};
const updateUserRole = (connection) => (req, res) => {
    const { userId, newRole } = req.body;

    const updateUserRoleQuery = 'UPDATE E_User SET userType = ? WHERE user_id = ?';
    connection.query(updateUserRoleQuery, [newRole, userId], (error, results) => {
        if (error) {
            console.error('Error updating user role:', error);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.status(200).json({ message: 'User role updated successfully' });
    });
};

const deleteUser = (connection) => (req, res) => {
    const { userId } = req.body;

    const deleteUserQuery = 'DELETE FROM E_User WHERE user_id = ?';
    connection.query(deleteUserQuery, [userId], (error, results) => {
        if (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.status(200).json({ message: 'User deleted successfully' });
    });
};

module.exports = {
    register,
    login,getUserTypeById,
    changeToSeller,
    deleteUser,addUser,updateUserRole,
    resetPassword,
    forgotPassword
};

