#include <iostream>
#include <mysql.h>

// Sử dụng namespace std để không cần phải viết std:: trước mỗi tên trong namespace std
using namespace std;

int main() {
    MYSQL *conn;
    MYSQL_RES *res;
    MYSQL_ROW row;

    // Khởi tạo kết nối
    conn = mysql_init(NULL);

    // Kết nối đến cơ sở dữ liệu MySQL
    if (!mysql_real_connect(conn, "localhost", "root", "123", "employees", 0, NULL, 0)) {
        cerr << "Error connecting to MySQL: " << mysql_error(conn) << endl;
        return 1;
    }

    cout << "Connected to MySQL" << endl;

    // Thực thi truy vấn
    if (mysql_query(conn, "SELECT * FROM employees_info")) {
        cerr << "Error executing query: " << mysql_error(conn) << endl;
        mysql_close(conn);
        return 1;
    }

    // Lấy kết quả
    res = mysql_store_result(conn);

    // In ra dữ liệu
    while ((row = mysql_fetch_row(res)) != NULL) {
        for (int i = 0; i < mysql_num_fields(res); i++) {
            cout << row[i] << " ";
        }
        cout << endl;
    }

    // Giải phóng bộ nhớ
    mysql_free_result(res);

    // Đóng kết nối
    mysql_close(conn);

    return 0;
}
