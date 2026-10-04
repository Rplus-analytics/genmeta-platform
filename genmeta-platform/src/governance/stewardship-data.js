/* Snapshot of the old UI's Stewardship page (dev site, read 4 Oct 2026). */
const REG_A = `INT.CUSTOMER~Rplus_DWH~R~t~Rajesh|m~Priya|m~steward|a~-
INT.LINEITEM~Rplus_DWH~C~t~PK|d~Rajesh|i~steward|a~-
INT.NATION~Rplus_DWH~I~t~Raghav|d~Rajesh|i~steward|a~-
INT.ORDERS~Rplus_DWH~R~t~PK|d~Rajesh|i~-~-
INT.PART~Rplus_DWH~I~t~Raghav|d~Rajesh|i~-~-
INT.SUPPLIER~Rplus_DWH~I~t~Raghav|d~Rajesh|i~-~-
PRL.ORDER_MASTER~Rplus_DWH~R~t~PK|d~-~-~-
SRC.CUSTOMER~Rplus_DWH~R~t~Rajesh|m~Rajesh|a~-~Dana Whitfield (test user)|i
SRC.LINEITEM~Rplus_DWH~C~t~PK|d~PK|a~-~Dana Whitfield (test user)|i
SRC.NATION~Rplus_DWH~I~t~Raghav|d~Rajesh|i~-~Dana Whitfield (test user)|i
SRC.ORDERS~Rplus_DWH~R~t~PK|m~PK|a~-~Dana Whitfield (test user)|i
SRC.PART~Rplus_DWH~I~t~Raghav|d~Rajesh|i~-~Dana Whitfield (test user)|i
SRC.SUPPLIER~Rplus_DWH~I~t~Raghav|d~Rajesh|i~-~Dana Whitfield (test user)|i
STG.CUSTOMER_ORDER~Rplus_DWH~R~t~Rajesh|d~-~-~-
STG.CUSTOMER_ORDER_LIVE_RPLUS~Rplus_DWH~R~t~Rajesh|d~-~-~-
STG.ORDER_ITEM_SUMMARY~Rplus_DWH~R~t~PK|d~-~-~-
STREAMING.customer-value~Rplus Streaming (Confluent)~R~f~Rajesh|d~-~-~-
S3_RAW.CUSTOMER~Rplus Amazon S3~R~f~Rajesh|d~-~-~-
S3_RAW.ORDERS~Rplus Amazon S3~R~f~PK|d~-~-~-
S3_CLN.CUSTOMER~Rplus Amazon S3~R~f~Rajesh|d~-~-~-
S3_CLN.ORDERS~Rplus Amazon S3~R~f~PK|d~-~-~-
S3_ENR.CUSTOMER_ORDERS~Rplus Amazon S3~R~f~Rajesh|d~-~-~-
S3_ENR.CUSTOMER_SUMMARY~Rplus Amazon S3~R~f~Rajesh|d~-~-~-
BI.Customer 360 Dashboard~Rplus Reports (Power BI)~R~r~Rajesh|d~Rajesh|a~-~-
BI.Order Revenue Report~Rplus Reports (Power BI)~C~r~PK|d~Raghav|a~-~-
BI.Supplier Performance~Rplus Reports (Power BI)~I~r~Meera Shah (test user)|a~Raghav|a~-~-
BI.Customer Churn Analysis~Rplus Reports (Power BI)~R~r~Rajesh|d~Raghav|a~-~-
API.GET_customers~Rplus API (Rest API)~R~f~Rajesh|d~-~-~-
API.GET_customers_customerId~Rplus API (Rest API)~R~f~Rajesh|d~-~-~-
API.GET_orders~Rplus API (Rest API)~R~f~PK|d~-~-~-
API.POST_orders~Rplus API (Rest API)~R~f~PK|d~-~-~-
PETSTORE_API_API.POST_pet~Rplus Petstore API~R~f~Raghav|d~-~-~-
PETSTORE_API_API.PUT_pet~Rplus Petstore API~R~f~Raghav|d~-~-~-
PETSTORE_API_API.GET_pet_findByStatus~Rplus Petstore API~R~f~Raghav|d~-~-~-
PETSTORE_API_API.GET_pet_findByTags~Rplus Petstore API~R~f~Raghav|m~Priya|m~Platform Ops|m~-
PETSTORE_API_API.GET_pet_petId~Rplus Petstore API~R~f~Raghav|d~-~-~-
PETSTORE_API_API.POST_pet_petId~Rplus Petstore API~R~f~Raghav|d~-~-~-
PETSTORE_API_API.DELETE_pet_petId~Rplus Petstore API~I~f~Raghav|d~-~-~-
PETSTORE_API_API.POST_pet_petId_uploadImage~Rplus Petstore API~I~f~Raghav|d~-~-~-
PETSTORE_API_API.GET_store_inventory~Rplus Petstore API~I~f~Raghav|d~-~-~-
PETSTORE_API_API.POST_store_order~Rplus Petstore API~I~f~PK|d~-~-~-
PETSTORE_API_API.GET_store_order_orderId~Rplus Petstore API~I~f~PK|d~-~-~-
PETSTORE_API_API.DELETE_store_order_orderId~Rplus Petstore API~I~f~PK|d~-~-~-
PETSTORE_API_API.POST_user~Rplus Petstore API~R~f~Raghav|d~-~-~-
PETSTORE_API_API.POST_user_createWithList~Rplus Petstore API~R~f~Raghav|d~-~-~-
PETSTORE_API_API.GET_user_login~Rplus Petstore API~R~f~Raghav|d~-~-~-
PETSTORE_API_API.GET_user_logout~Rplus Petstore API~I~f~Raghav|d~-~-~-
PETSTORE_API_API.GET_user_username~Rplus Petstore API~R~f~Raghav|d~-~-~-
PETSTORE_API_API.PUT_user_username~Rplus Petstore API~R~f~Raghav|d~-~-~-
PETSTORE_API_API.DELETE_user_username~Rplus Petstore API~R~f~Raghav|d~-~-~-`;
const REG_BULK = `RPLUS_DATABRICKS_RPLUS2_GENMETA_DEMO|customer_order_summary:R:J,customers:R:J,high_value_customers:R:J,order_items:C:P,orders:R:P,products:R:R
RPLUS_DATABRICKS_RPLUS_DEMO_1RPLUS_BRONZE|1rplus_bronze_esa:R:R,2rplus_bronze_jsaps:R:R,3rplus_bronze_pip:R:R,4rplus_bronze_uc:R:R,esa_path:I:R,rplus_bronze_hb:R:R
RPLUS_DATABRICKS_RPLUS_DEMO_2RPLUS_SILVER|1rplus_silver_esa_jsaps:R:R,2rplus_silver_pip_uc:R:R,3rplus_silver_uc_curated:R:R,esa:R:R,jsaps:R:R,pip:R:R,rplus_silver_hb_esa:R:R
RPLUS_DATABRICKS_RPLUS_DEMO_3RPLUS_GOLD|1rplus_gold_esa_jsaps_pip_uc:R:R,2rplus_gold_jsa:C:R,esa:R:R,jsa:C:R,jsaps:R:R,pip:R:R,rplus_gold_hb_esa:R:R,uc:R:R
RPLUS_DATABRICKS_SAMPLES_ACCUWEATHER|forecast_daily_calendar_imperial:R:R,forecast_daily_calendar_metric:R:R,forecast_daynight_imperial:R:R,forecast_daynight_metric:R:R,forecast_hourly_imperial:R:R,forecast_hourly_metric:R:R,historical_daily_calendar_imperial:R:R,historical_daily_calendar_metric:R:R,historical_daynight_imperial:R:R,historical_daynight_metric:R:R,historical_hourly_imperial:R:R,historical_hourly_metric:R:R
RPLUS_DATABRICKS_SAMPLES_BAKEHOUSE|media_customer_reviews:I:J,media_gold_reviews_chunked:I:R,sales_customers:R:J,sales_franchises:R:R,sales_suppliers:R:R,sales_transactions:R:R
RPLUS_DATABRICKS_SAMPLES_CLICKBENCH|hits:R:R
RPLUS_DATABRICKS_SAMPLES_HEALTHVERITY|claims_sample_synthetic:C:R
RPLUS_DATABRICKS_SAMPLES_NYCTAXI|trips:R:R
TPCDS|call_center:R:R,catalog_page:I:R,catalog_returns:C:R,catalog_sales:C:R,customer:R:J,customer_address:R:J,customer_demographics:I:J,date_dim:R:R,household_demographics:C:R,income_band:C:R,inventory:I:R,item:R:R,promotion:R:R,reason:I:R,ship_mode:I:R,store:R:R,store_returns:I:R,store_sales:C:R,time_dim:I:R,warehouse:R:R,web_page:I:R,web_returns:I:R,web_sales:C:R,web_site:R:R
TPCH|customer:R:J,lineitem:I:P,nation:R:R,orders:I:P,part:R:R,partsupp:I:R,region:R:R,supplier:R:R
RPLUS_DATABRICKS_SAMPLES_WANDERBRICKS|amenities:R:R,booking_updates:C:R,bookings:C:R,clickstream:I:R,countries:I:R,customer_support_logs:I:J,destinations:I:R,employees:R:R,hosts:R:R,page_views:I:R,payments:C:R,properties:C:R,property_amenities:I:R,property_images:I:R,reviews:I:R,users:R:R`;
const RQ = `PETSTORE_API_API.GET_user_login~H~PHusername,CMpassword
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.income_band~H~FMib_income_band_sk
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.income_band~H~FMib_income_band_sk
RPLUS_DATABRICKS_SAMPLES_TPCH.region~H~PHr_name
RPLUS_DATABRICKS_SAMPLES_TPCH_SF1.region~H~PHr_name
RPLUS_DATABRICKS_SAMPLES_TPCH_SF10.region~H~PHr_name
RPLUS_DATABRICKS_SAMPLES_TPCH_SF100.region~H~PHr_name
RPLUS_DATABRICKS_SAMPLES_TPCH_SF1000.region~H~PHr_name
RPLUS_DATABRICKS_RPLUS_DEMO_3RPLUS_GOLD.jsa~H~FMMean_of_Weekly_Award_Amount
RPLUS_DATABRICKS_SAMPLES_TPCH.nation~H~PHn_name
RPLUS_DATABRICKS_SAMPLES_TPCH_SF1.nation~H~PHn_name
RPLUS_DATABRICKS_SAMPLES_TPCH_SF10.nation~H~PHn_name
RPLUS_DATABRICKS_SAMPLES_TPCH_SF100.nation~H~PHn_name
RPLUS_DATABRICKS_SAMPLES_TPCH_SF1000.nation~H~PHn_name
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.household_demographics~H~FMhd_income_band_sk
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.household_demographics~H~FMhd_income_band_sk
RPLUS_DATABRICKS_SAMPLES_NYCTAXI.trips~H~PHpickup_zip,PHdropoff_zip,FMfare_amount
RPLUS_DATABRICKS_SAMPLES_TPCH.supplier~H~PHs_name,PHs_address,PHs_phone
RPLUS_DATABRICKS_SAMPLES_TPCH_SF1.supplier~H~PHs_name,PHs_address,PHs_phone
RPLUS_DATABRICKS_SAMPLES_TPCH_SF10.supplier~H~PHs_name,PHs_address,PHs_phone
RPLUS_DATABRICKS_SAMPLES_TPCH_SF100.supplier~H~PHs_name,PHs_address,PHs_phone
RPLUS_DATABRICKS_SAMPLES_TPCH_SF1000.supplier~H~PHs_name,PHs_address,PHs_phone
RPLUS_DATABRICKS_SAMPLES_CLICKBENCH.hits~H~PHIsMobile,PHMobilePhone,PHMobilePhoneModel,PHWindowName,PHOpenerName,PHOpenstatServiceName,FMIncome,FMParamPrice
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.catalog_returns~H~FMcr_return_amount
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.catalog_sales~H~FMcs_list_price,FMcs_sales_price,FMcs_ext_sales_price,FMcs_ext_list_price
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.store_sales~H~FMss_list_price,FMss_sales_price,FMss_ext_sales_price,FMss_ext_list_price
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.web_sales~H~FMws_list_price,FMws_sales_price,FMws_ext_sales_price,FMws_ext_list_price
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.catalog_returns~H~FMcr_return_amount
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.catalog_sales~H~FMcs_list_price,FMcs_sales_price,FMcs_ext_sales_price,FMcs_ext_list_price
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.store_sales~H~FMss_list_price,FMss_sales_price,FMss_ext_sales_price,FMss_ext_list_price
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.web_sales~H~FMws_list_price,FMws_sales_price,FMws_ext_sales_price,FMws_ext_list_price
RPLUS_DATABRICKS_SAMPLES_TPCH.customer~H~PHc_name,PHc_address,PHc_phone
RPLUS_DATABRICKS_SAMPLES_TPCH.part~H~PHp_name
RPLUS_DATABRICKS_SAMPLES_TPCH_SF1.customer~H~PHc_name,PHc_address,PHc_phone
RPLUS_DATABRICKS_SAMPLES_TPCH_SF1.part~H~PHp_name
RPLUS_DATABRICKS_SAMPLES_TPCH_SF10.customer~H~PHc_name,PHc_address,PHc_phone
RPLUS_DATABRICKS_SAMPLES_TPCH_SF10.part~H~PHp_name
RPLUS_DATABRICKS_SAMPLES_TPCH_SF100.customer~H~PHc_name,PHc_address,PHc_phone
RPLUS_DATABRICKS_SAMPLES_TPCH_SF100.part~H~PHp_name
RPLUS_DATABRICKS_SAMPLES_TPCH_SF1000.customer~H~PHc_name,PHc_address,PHc_phone
RPLUS_DATABRICKS_SAMPLES_TPCH_SF1000.part~H~PHp_name
RPLUS_DATABRICKS_RPLUS_DEMO_3RPLUS_GOLD.2rplus_gold_jsa~H~FMMean of Weekly Award Amount (III)
RPLUS_DATABRICKS_SAMPLES_BAKEHOUSE.sales_franchises~H~PHname
RPLUS_DATABRICKS_SAMPLES_BAKEHOUSE.sales_suppliers~H~PHname
RPLUS_DATABRICKS_SAMPLES_BAKEHOUSE.sales_transactions~H~PHcustomerID,FMunitPrice,FMtotalPrice,FMcardNumber
SRC.CUSTOMER~H~PHCUSTOMER_ID,PHCUSTOMER_NAME,SMSEGMENT,FMACCOUNT_BALANCE
RPLUS_DATABRICKS_RPLUS2_GENMETA_DEMO.high_value_customers~H~PHcustomer_id,PHcustomer_name
RPLUS_DATABRICKS_RPLUS2_GENMETA_DEMO.order_items~H~FMunit_price
RPLUS_DATA_LAKE_ADLS_ENR.product_performance~H~FMrevenue
SRC.ORDERS~H~PHCUSTOMER_ID,FMTOTAL_AMOUNT
PETSTORE_API_API.POST_pet~H~PHname
PETSTORE_API_API.PUT_pet~H~PHname
RPLUS_DATABRICKS_RPLUS2_GENMETA_DEMO.customer_order_summary~H~PHcustomer_id,PHcustomer_name
RPLUS_DATA_LAKE_ADLS_CLN.order_items~H~FMunit_price
RPLUS_DATA_LAKE_ADLS_CLN.products~H~PHproduct_name,FMunit_price
RPLUS_DATA_LAKE_ADLS_ENR.customer_360~H~PHcustomer_id,SMsegment
RPLUS_DATA_LAKE_ADLS_RAW.products~H~PHproduct_name,FMunit_price
SRC.LINEITEM~H~FMEXTENDED_PRICE
PETSTORE_API_API.POST_user~H~PHusername,PHfirstName,PHlastName,PHemail,PHphone,CMpassword
PETSTORE_API_API.POST_user_createWithList~H~PHusername,PHfirstName,PHlastName,PHemail,PHphone,CMpassword
RPLUS_DATABRICKS_RPLUS_DEMO_1RPLUS_BRONZE.1rplus_bronze_esa~H~@DWP:esa
RPLUS_DATABRICKS_RPLUS_DEMO_1RPLUS_BRONZE.2rplus_bronze_jsaps~H~@DWP:jsaps
RPLUS_DATABRICKS_RPLUS_DEMO_1RPLUS_BRONZE.3rplus_bronze_pip~H~@DWP:pip
RPLUS_DATABRICKS_RPLUS_DEMO_1RPLUS_BRONZE.4rplus_bronze_uc~H~@DWP:uc
RPLUS_DATABRICKS_RPLUS_DEMO_1RPLUS_BRONZE.rplus_bronze_hb~H~@DWP:hb
RPLUS_DATABRICKS_RPLUS_DEMO_2RPLUS_SILVER.1rplus_silver_esa_jsaps~H~@DWP:
RPLUS_DATABRICKS_RPLUS_DEMO_2RPLUS_SILVER.2rplus_silver_pip_uc~H~@DWP:
RPLUS_DATABRICKS_RPLUS_DEMO_2RPLUS_SILVER.3rplus_silver_uc_curated~H~@DWP:uc
RPLUS_DATABRICKS_RPLUS_DEMO_2RPLUS_SILVER.esa~H~@DWP:esa
RPLUS_DATABRICKS_RPLUS_DEMO_2RPLUS_SILVER.jsaps~H~@DWP:jsaps
RPLUS_DATABRICKS_RPLUS_DEMO_2RPLUS_SILVER.pip~H~@DWP:pip
RPLUS_DATABRICKS_RPLUS_DEMO_2RPLUS_SILVER.rplus_silver_hb_esa~H~@DWP:esa
RPLUS_DATABRICKS_RPLUS_DEMO_3RPLUS_GOLD.1rplus_gold_esa_jsaps_pip_uc~H~@DWP:
RPLUS_DATABRICKS_RPLUS_DEMO_3RPLUS_GOLD.esa~H~@DWP:esa
RPLUS_DATABRICKS_RPLUS_DEMO_3RPLUS_GOLD.jsaps~H~@DWP:jsaps
RPLUS_DATABRICKS_RPLUS_DEMO_3RPLUS_GOLD.pip~H~@DWP:pip
RPLUS_DATABRICKS_RPLUS_DEMO_3RPLUS_GOLD.rplus_gold_hb_esa~H~@DWP:esa
RPLUS_DATABRICKS_RPLUS_DEMO_3RPLUS_GOLD.uc~H~@DWP:uc
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.call_center~H~PHcc_name,PHcc_division_name,PHcc_company_name,PHcc_street_name,PHcc_zip
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.customer~H~PHc_first_name,PHc_last_name,PHc_email_address
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.customer_address~H~PHca_address_sk,PHca_address_id,PHca_street_name,PHca_zip
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.date_dim~H~PHd_day_name,PHd_quarter_name
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.item~H~PHi_product_name,FMi_current_price
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.promotion~H~PHp_promo_name,PHp_channel_email
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.store~H~PHs_store_name,PHs_division_name,PHs_company_name,PHs_street_name,PHs_zip
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.warehouse~H~PHw_warehouse_name,PHw_street_name,PHw_zip
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.web_site~H~PHweb_name,PHweb_company_name,PHweb_street_name,PHweb_zip
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.call_center~H~PHcc_name,PHcc_division_name,PHcc_company_name,PHcc_street_name,PHcc_zip
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.customer~H~PHc_first_name,PHc_last_name,PHc_email_address
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.customer_address~H~PHca_address_sk,PHca_address_id,PHca_street_name,PHca_zip
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.date_dim~H~PHd_day_name,PHd_quarter_name
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.item~H~PHi_product_name,FMi_current_price
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.promotion~H~PHp_promo_name,PHp_channel_email
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.store~H~PHs_store_name,PHs_division_name,PHs_company_name,PHs_street_name,PHs_zip
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.warehouse~H~PHw_warehouse_name,PHw_street_name,PHw_zip
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.web_site~H~PHweb_name,PHweb_company_name,PHweb_street_name,PHweb_zip
RPLUS_DATA_LAKE_ADLS_CLN.customers~H~PHcustomer_id,PHfull_name,PHemail,PHphone,PHpostcode,SMdate_of_birth
RPLUS_DATA_LAKE_ADLS_CLN.orders~H~PHcustomer_id
BI.Customer Churn Analysis~H~PHCUSTOMER_ID
PETSTORE_API_API.PUT_user_username~H~PHusername
PETSTORE_API_API.DELETE_user_username~H~PHusername
STREAMING.customer-value~H~PHCUSTOMER_ID,PHCUSTOMER_NAME,SMSEGMENT,FMACCOUNT_BALANCE
INT.CUSTOMER~H~PHCUSTOMER_ID,PHCUSTOMER_NAME,SMSEGMENT,FMACCOUNT_BALANCE
BI.Customer 360 Dashboard~H~PHCUSTOMER_ID,PHCUSTOMER_NAME,MMCUSTOMER_SEGMENT,FMACCOUNT_BALANCE
API.POST_orders~H~PHcustomer_id,FMtotal_amount
PETSTORE_API_API.GET_pet_findByStatus~H~PHname
PETSTORE_API_API.GET_pet_findByTags~H~PHname
PETSTORE_API_API.GET_pet_petId~H~PHname
RPLUS_DATABRICKS_RPLUS2_GENMETA_DEMO.products~H~PHproduct_name,FMunit_price
RPLUS_DATA_LAKE_ADLS_RAW.customers~H~PHcustomer_id,PHfull_name,PHemail,PHphone,PHpostcode,SMdate_of_birth
RPLUS_DATA_LAKE_ADLS_RAW.order_items~H~FMunit_price
PETSTORE_API_API.POST_pet_petId~H~PHname,PHname
PETSTORE_API_API.GET_user_username~H~PHusername,PHusername,PHfirstName,PHlastName,PHemail,PHphone,CMpassword
RPLUS_DATA_LAKE_ADLS_RAW.clickstream~H~PHcustomer_id
RPLUS_DATA_LAKE_ADLS_RAW.orders~H~PHcustomer_id
RPLUS_DATA_LAKE_ADLS_RAW.payments~H~FMamount
INT.ORDERS~H~PHCUSTOMER_ID,FMTOTAL_AMOUNT
BI.Order Revenue Report~H~FMTOTAL_AMOUNT
API.GET_orders~H~PHcustomer_id,FMtotal_amount
RPLUS_DATABRICKS_RPLUS2_GENMETA_DEMO.orders~H~PHcustomer_id
API.GET_customers~H~PHcustomer_id,PHfull_name,PHemail,SMsegment,SMsegment,FMaccount_balance
INT.LINEITEM~H~FMEXTENDED_PRICE
STG.CUSTOMER_ORDER~H~PHCUSTOMER_ID,PHCUSTOMER_NAME,MMCUSTOMER_SEGMENT,FMCUSTOMER_ACCOUNT_BALANCE,FMORDER_TOTAL_AMOUNT
STG.CUSTOMER_ORDER_LIVE_RPLUS~H~PHCUSTOMER_ID,PHCUSTOMER_NAME,MMCUSTOMER_SEGMENT,FMCUSTOMER_ACCOUNT_BALANCE,FMORDER_TOTAL_AMOUNT
STG.ORDER_ITEM_SUMMARY~H~PHSAMPLE_SUPPLIER_NAME,FMMAX_RETAIL_PRICE
RPLUS_DATABRICKS_RPLUS2_GENMETA_DEMO.customers~H~PHcustomer_id,PHcustomer_name,PHemail_address,PHphone_number,PHpostcode,SMdate_of_birth,GMnational_insurance_no
RPLUS_DATABRICKS_SAMPLES_ACCUWEATHER.forecast_daily_calendar_imperial~H~PHcity_name
RPLUS_DATABRICKS_SAMPLES_ACCUWEATHER.forecast_daily_calendar_metric~H~PHcity_name
RPLUS_DATABRICKS_SAMPLES_ACCUWEATHER.forecast_daynight_imperial~H~PHcity_name
RPLUS_DATABRICKS_SAMPLES_ACCUWEATHER.forecast_daynight_metric~H~PHcity_name
RPLUS_DATABRICKS_SAMPLES_ACCUWEATHER.forecast_hourly_imperial~H~PHcity_name
RPLUS_DATABRICKS_SAMPLES_ACCUWEATHER.forecast_hourly_metric~H~PHcity_name
RPLUS_DATABRICKS_SAMPLES_ACCUWEATHER.historical_daily_calendar_imperial~H~PHcity_name
RPLUS_DATABRICKS_SAMPLES_ACCUWEATHER.historical_daily_calendar_metric~H~PHcity_name
RPLUS_DATABRICKS_SAMPLES_ACCUWEATHER.historical_daynight_imperial~H~PHcity_name
RPLUS_DATABRICKS_SAMPLES_ACCUWEATHER.historical_daynight_metric~H~PHcity_name
RPLUS_DATABRICKS_SAMPLES_ACCUWEATHER.historical_hourly_imperial~H~PHcity_name
RPLUS_DATABRICKS_SAMPLES_ACCUWEATHER.historical_hourly_metric~H~PHcity_name
RPLUS_DATABRICKS_SAMPLES_BAKEHOUSE.sales_customers~H~PHcustomerID,PHfirst_name,PHlast_name,PHemail_address,PHphone_number,PHaddress,PHpostal_zip_code
RPLUS_DATABRICKS_SAMPLES_HEALTHVERITY.claims_sample_synthetic~H~FMrevenue_code
PETSTORE_API_API.DELETE_pet_petId~H~CMapi_key
PRL.ORDER_MASTER~H~PHCUSTOMER_ID,PHCUSTOMER_NAME,PHSAMPLE_SUPPLIER_NAME,MMCUSTOMER_SEGMENT,FMCUSTOMER_ACCOUNT_BALANCE,FMORDER_TOTAL_AMOUNT,FMMAX_RETAIL_PRICE
API.GET_customers_customerId~H~PHcustomerId,PHcustomer_id,PHfull_name,PHemail,SMsegment,FMaccount_balance
RPLUS_DATABRICKS_SAMPLES_WANDERBRICKS.amenities~H~PHname
RPLUS_DATABRICKS_SAMPLES_WANDERBRICKS.booking_updates~H~FMtotal_amount
RPLUS_DATABRICKS_SAMPLES_WANDERBRICKS.payments~H~FMamount
RPLUS_DATABRICKS_SAMPLES_WANDERBRICKS.properties~H~FMbase_price
RPLUS_DATABRICKS_SAMPLES_WANDERBRICKS.bookings~H~FMtotal_amount
RPLUS_DATABRICKS_SAMPLES_WANDERBRICKS.employees~H~PHname,PHemail,PHphone
RPLUS_DATABRICKS_SAMPLES_WANDERBRICKS.hosts~H~PHname,PHemail,PHphone
RPLUS_DATABRICKS_SAMPLES_WANDERBRICKS.users~H~PHemail,PHname,PHcompany_name
S3_RAW.CUSTOMER~H~PHCUSTOMER_ID,PHCUSTOMER_NAME,SMSEGMENT,FMACCOUNT_BALANCE
S3_CLN.CUSTOMER~H~PHCUSTOMER_ID,PHCUSTOMER_NAME,SMSEGMENT,FMACCOUNT_BALANCE
S3_ENR.CUSTOMER_SUMMARY~H~PHCUSTOMER_ID,PHCUSTOMER_NAME,SMSEGMENT,FMTOTAL_ORDER_AMOUNT
S3_RAW.ORDERS~H~PHCUSTOMER_ID,FMTOTAL_AMOUNT
S3_CLN.ORDERS~H~PHCUSTOMER_ID,FMTOTAL_AMOUNT
S3_ENR.CUSTOMER_ORDERS~H~PHCUSTOMER_ID,PHCUSTOMER_NAME,FMTOTAL_AMOUNT,MMCUSTOMER_SEGMENT,FMCUSTOMER_ACCOUNT_BALANCE
PETSTORE_API_API.GET_store_inventory~M~
PETSTORE_API_API.GET_user_logout~M~
CLOUDIQ_API.GET_summary~M~
CLOUDIQ_API.GET_providers~M~
CLOUDIQ_API.GET_costs~M~
CLOUDIQ_API.GET_instances~M~
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.inventory~M~
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.inventory~M~
RPLUS_DATABRICKS_SAMPLES_TPCH.partsupp~M~
RPLUS_DATABRICKS_SAMPLES_TPCH_SF1.partsupp~M~
RPLUS_DATABRICKS_SAMPLES_TPCH_SF10.partsupp~M~
RPLUS_DATABRICKS_SAMPLES_TPCH_SF100.partsupp~M~
RPLUS_DATABRICKS_SAMPLES_TPCH_SF1000.partsupp~M~
RPLUS_DATA_LAKE_ADLS_ENR.order_summary_monthly~M~
RPLUS_DATABRICKS_RPLUS_DEMO_1RPLUS_BRONZE.esa_path~M~
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.customer_demographics~M~
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.store_returns~M~
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.web_returns~M~
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.customer_demographics~M~
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.store_returns~M~
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.web_returns~M~
RPLUS_DATABRICKS_SAMPLES_TPCH.lineitem~M~
RPLUS_DATABRICKS_SAMPLES_TPCH.orders~M~
RPLUS_DATABRICKS_SAMPLES_TPCH_SF1.lineitem~M~
RPLUS_DATABRICKS_SAMPLES_TPCH_SF1.orders~M~
RPLUS_DATABRICKS_SAMPLES_TPCH_SF10.lineitem~M~
RPLUS_DATABRICKS_SAMPLES_TPCH_SF10.orders~M~
RPLUS_DATABRICKS_SAMPLES_TPCH_SF100.lineitem~M~
RPLUS_DATABRICKS_SAMPLES_TPCH_SF100.orders~M~
RPLUS_DATABRICKS_SAMPLES_TPCH_SF1000.lineitem~M~
RPLUS_DATABRICKS_SAMPLES_TPCH_SF1000.orders~M~
PETSTORE_API_API.POST_pet_petId_uploadImage~M~
SRC.NATION~M~
SRC.SUPPLIER~M~
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.reason~M~
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.reason~M~
SRC.PART~M~
PETSTORE_API_API.POST_store_order~M~
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.ship_mode~M~
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.ship_mode~M~
INT.NATION~M~
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.catalog_page~M~
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.time_dim~M~
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1.web_page~M~
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.catalog_page~M~
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.time_dim~M~
RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000.web_page~M~
INT.SUPPLIER~M~
PETSTORE_API_API.DELETE_store_order_orderId~M~
BI.Supplier Performance~M~
RPLUS_DATABRICKS_SAMPLES_BAKEHOUSE.media_customer_reviews~M~
INT.PART~M~
PETSTORE_API_API.GET_store_order_orderId~M~
RPLUS_DATABRICKS_SAMPLES_BAKEHOUSE.media_gold_reviews_chunked~M~
RPLUS_DATABRICKS_SAMPLES_WANDERBRICKS.clickstream~M~
RPLUS_DATABRICKS_SAMPLES_WANDERBRICKS.customer_support_logs~M~
RPLUS_DATABRICKS_SAMPLES_WANDERBRICKS.destinations~M~
RPLUS_DATABRICKS_SAMPLES_WANDERBRICKS.page_views~M~
RPLUS_DATABRICKS_SAMPLES_WANDERBRICKS.property_images~M~
RPLUS_DATABRICKS_SAMPLES_WANDERBRICKS.countries~M~
RPLUS_DATABRICKS_SAMPLES_WANDERBRICKS.reviews~M~
RPLUS_DATABRICKS_SAMPLES_WANDERBRICKS.property_amenities~M~`;

const SRC_BY = { R: 'Raghav', J: 'Rajesh', P: 'PK' };
const SENS = { R: 'Restricted', C: 'Confidential', I: 'Internal' };
const KIND = { t: 'table', f: 'file, API or topic', r: 'report' };
export const HOW = { a: 'assigned', i: 'inherited from dataset', m: 'imported', d: 'configured default' };
export const ROLE_COLS = [['owner', 'Data owner'], ['steward', 'Data steward'], ['custodian', 'Data custodian'], ['privacy', 'Privacy lead']];

const cell = (s) => (s === '-' ? null : { who: s.split('|')[0], how: s.split('|')[1] });
const rows = REG_A.split('\n').map((l) => {
  const [asset, system, sens, kind, owner, steward, custodian, privacy] = l.split('~');
  return { asset, system, sens: SENS[sens], kind: KIND[kind], roles: { owner: cell(owner), steward: cell(steward), custodian: cell(custodian), privacy: cell(privacy) } };
});
const bulk = (system, kind) => (line) => {
  const [schema, list] = line.split('|');
  const schemas = schema === 'TPCDS' ? ['RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1', 'RPLUS_DATABRICKS_SAMPLES_TPCDS_SF1000']
    : schema === 'TPCH' ? ['RPLUS_DATABRICKS_SAMPLES_TPCH', 'RPLUS_DATABRICKS_SAMPLES_TPCH_SF1', 'RPLUS_DATABRICKS_SAMPLES_TPCH_SF10', 'RPLUS_DATABRICKS_SAMPLES_TPCH_SF100', 'RPLUS_DATABRICKS_SAMPLES_TPCH_SF1000'] : [schema];
  return schemas.flatMap((s) => list.split(',').map((x) => {
    const [t, sens, o] = x.split(':');
    return { asset: `${s}.${t}`, system, sens: SENS[sens], kind, roles: { owner: { who: SRC_BY[o], how: 'd' }, steward: null, custodian: null, privacy: null } };
  }));
};
const ADLS = 'RPLUS_DATA_LAKE_ADLS_CLN|customers:R:J,order_items:C:P,orders:R:P,products:R:R\nRPLUS_DATA_LAKE_ADLS_ENR|customer_360:R:J,order_summary_monthly:I:P,product_performance:C:R\nRPLUS_DATA_LAKE_ADLS_RAW|clickstream:R:R,customers:R:J,order_items:C:P,orders:R:P,payments:C:R,products:R:R';
const CLOUDIQ = 'CLOUDIQ_API|GET_summary:I:R,GET_providers:I:R,GET_instances:I:R,GET_costs:I:R';

/* the ownership register — 219 assets, in the old UI's order */
export const REGISTER = [
  ...rows,
  ...REG_BULK.split('\n').flatMap(bulk('Rplus_Databricks', 'table')),
  ...ADLS.split('\n').flatMap(bulk('Rplus Data Lake (ADLS)', 'file, API or topic')),
  ...CLOUDIQ.split('\n').flatMap(bulk('CloudIQ', 'file, API or topic')),
];
export const datasetOf = (a) => a.slice(0, a.indexOf('.'));

/* assignment detail shown when an asset is opened (who assigned it, and when) */
const T1 = '19 Sept 2026, 15:44';
export const ASSIGN_LOG = {
  'INT.CUSTOMER': [['data-analyst', 'Muni', 'assigned by Admin 24 Sept 2026, 07:03'], ['Data custodian', 'steward', 'assigned by Admin 24 Sept 2026, 08:12']],
  'INT.LINEITEM': [['Data custodian', 'steward', 'assigned by Admin 24 Sept 2026, 08:49']],
  'INT.NATION': [['Data custodian', 'steward', 'assigned by Admin 24 Sept 2026, 08:49']],
  'BI.Supplier Performance': [['Data owner', 'Meera Shah (test user)', `assigned by Raghav ${T1}`]],
};
export const DEFAULT_BY = `by Admin ${T1}`;
export const COLUMN_LEVEL = { 'SRC.CUSTOMER': 'Column-level: ACCOUNT_BALANCE → Data steward Dana Whitfield (test user)' };
export const PEOPLE = ['Raghav', 'Rajesh', 'PK', 'Priya', 'Muni', 'steward', 'Platform Ops', 'Dana Whitfield (test user)', 'Meera Shah (test user)'];

/* roles & responsibilities — governance model v6 */
export const RESPONSIBILITIES = [
  'Accountable for the asset and its use', 'Approve or decline access requests', 'Grant and revoke access directly', 'Approve ownership and governance changes',
  'Raise, triage and resolve data-quality issues', 'Maintain descriptions, terms and classifications', 'Operate storage, security, backup and retention', 'Review coverage, audit and compliance',
];
export const MODEL_ROLES = [
  { key: 'owner', name: 'Data owner', builtIn: true, desc: 'Accountable individual for the asset.', resp: '11110001' },
  { key: 'steward', name: 'Data steward', builtIn: true, desc: 'Looks after quality and meaning day to day.', resp: '01101100' },
  { key: 'custodian', name: 'Data custodian', builtIn: true, desc: 'Runs the technical environment that holds the data.', resp: '00000010' },
  { key: 'privacy', name: 'Privacy lead', builtIn: false, desc: 'Signs off access to personal data and reviews privacy risk.', resp: '01000001' },
];
export const MODEL_CHANGES = [
  ['v6', '24 Sept 2026, 07:04', 'Admin', 'removed role Data Analyst'],
  ['v5', '24 Sept 2026, 07:01', 'Admin', 'changed role Data Analyst; added accountability, approve_access, approve_changes, governance_oversight, grant_revoke_access, maintain_metadata, manage_quality, technical_custody'],
  ['v4', '24 Sept 2026, 07:00', 'Admin', 'created bespoke role Data Analyst with no responsibilities'],
  ['v3', T1, 'Admin', "access policy for Confidential set to {'approver': 'owner_or_steward', 'max_days': 120, 'justification': True, 'mask_sensitive': True}"],
  ['v2', T1, 'Admin', 'created bespoke role Privacy lead with approve_access, governance_oversight'],
];

/* coverage: columns and datasets as the old UI counts them (asset types are computed from the register) */
export const COLUMN_COVERAGE = { count: 3500, owner: 3500, steward: 87, custodian: 24 };
export const DATASET_COVERAGE = { count: 32, owner: 32, steward: 3, custodian: 0 };

/* approvals & data-quality issues */
export const CHANGE_REQUESTS = [{ change: 'owner on asset BI.SUPPLIER PERFORMANCE: — → Meera Shah (test user)', by: 'Raghav', at: T1, reason: 'Supplier reporting moves to procurement', status: 'approved by Admin' }];
const RULE = {
  S: 'GDPR: Every asset holding personal data has a named steward — no steward assigned',
  R: 'GDPR: Every asset holding personal data appears in a record of processing — not in any accepted record of processing',
  T: 'GDPR: A retention requirement applies to every asset holding personal data — no active retention requirement applies',
};
const QI = `S~RPLUS_DATABRICKS_RPLUS_DEMO_2RPLUS_SILVER.esa~~29 Sept, 20:58~~
R~RPLUS_DATABRICKS_RPLUS_DEMO_2RPLUS_SILVER.3rplus_silver_uc_curated~~29 Sept, 20:58~~
S~RPLUS_DATABRICKS_RPLUS_DEMO_2RPLUS_SILVER.3rplus_silver_uc_curated~~29 Sept, 20:58~~
R~RPLUS_DATABRICKS_RPLUS_DEMO_2RPLUS_SILVER.2rplus_silver_pip_uc~~29 Sept, 20:58~~
S~RPLUS_DATABRICKS_RPLUS_DEMO_2RPLUS_SILVER.2rplus_silver_pip_uc~~29 Sept, 20:58~~
S~RPLUS_DATABRICKS_RPLUS_AWS_3RPLUS_GOLD.rplus_gold_esa_jsap_pip_uc~~29 Sept, 19:53~~
R~RPLUS_DATABRICKS_RPLUS_AWS_2RPLUS_SILVER.rplus_silver_pip_uc~~29 Sept, 19:53~~
S~RPLUS_DATABRICKS_RPLUS_AWS_2RPLUS_SILVER.rplus_silver_pip_uc~~29 Sept, 19:53~~
R~RPLUS_DATABRICKS_RPLUS_AWS_2RPLUS_SILVER.rplus_silver_hb_esa~~29 Sept, 19:53~~
S~RPLUS_DATABRICKS_RPLUS_AWS_2RPLUS_SILVER.rplus_silver_hb_esa~~29 Sept, 19:53~~
T~RPLUS_DATABRICKS_RPLUS_AWS_2RPLUS_SILVER.rplus_silver_hb_esa~~29 Sept, 13:49~~
R~RPLUS_DATABRICKS_RPLUS_AWS_2RPLUS_SILVER.rplus_silver_esa_jsaps~~29 Sept, 13:49~~
S~RPLUS_DATABRICKS_RPLUS_AWS_2RPLUS_SILVER.rplus_silver_esa_jsaps~~29 Sept, 13:49~~
T~RPLUS_DATABRICKS_RPLUS_AWS_2RPLUS_SILVER.rplus_silver_esa_jsaps~~29 Sept, 13:49~~
@RST~RPLUS_DATABRICKS_RPLUS_AWS_1RPLUS_BRONZE.rplus_bronze_uc~~29 Sept, 13:49
@RST~RPLUS_DATABRICKS_RPLUS_AWS_1RPLUS_BRONZE.rplus_bronze_pip~~29 Sept, 13:49
@RST~RPLUS_DATABRICKS_RPLUS_AWS_1RPLUS_BRONZE.rplus_bronze_jsaps~~29 Sept, 13:49
@RST~RPLUS_DATABRICKS_RPLUS_AWS_1RPLUS_BRONZE.rplus_bronze_hb~~29 Sept, 13:48
@RST~RPLUS_DATABRICKS_RPLUS_AWS_1RPLUS_BRONZE.1rplus_bronze_esa~~29 Sept, 13:48
S~STREAMING.customer-value~~24 Sept, 07:09~~resolved by Admin: test
S~STREAMING.customer-value~~23 Sept, 09:19~~
@ST~S3_RAW.CUSTOMER~~23 Sept, 08:12
@ST~S3_ENR.CUSTOMER_SUMMARY~~23 Sept, 08:12
@ST~S3_CLN.CUSTOMER~~23 Sept, 08:12
T~RPLUS_DATABRICKS_RPLUS_DEMO_2RPLUS_SILVER.2rplus_silver_pip_uc~~21 Sept, 14:37~~
@RST~RPLUS_DATABRICKS_RPLUS_DEMO_2RPLUS_SILVER.1rplus_silver_esa_jsaps~~21 Sept, 14:37
@RST~RPLUS_DATABRICKS_RPLUS_DEMO_1RPLUS_BRONZE.rplus_bronze_hb~~21 Sept, 14:37
@RST~RPLUS_DATABRICKS_RPLUS_DEMO_1RPLUS_BRONZE.4rplus_bronze_uc~~21 Sept, 14:37
@RST~RPLUS_DATABRICKS_RPLUS_DEMO_1RPLUS_BRONZE.3rplus_bronze_pip~~21 Sept, 14:37
@RST~RPLUS_DATABRICKS_RPLUS_DEMO_1RPLUS_BRONZE.2rplus_bronze_jsaps~~21 Sept, 14:37
@RST~RPLUS_DATABRICKS_RPLUS_DEMO_1RPLUS_BRONZE.1rplus_bronze_esa~~21 Sept, 14:37
@RST~RPLUS_DATABRICKS_SAMPLES_BAKEHOUSE.sales_customers~~21 Sept, 14:29
@RST~RPLUS_DATABRICKS_RPLUS2_GENMETA_DEMO.customers~~21 Sept, 14:29
@RST~RPLUS_DATABRICKS_SAMPLES_CLICKBENCH.hits~~21 Sept, 14:29
@ST~DATABRICKS_DWH_SAMPLES_TPCDS_SF1000.call_center~~21 Sept, 13:14
@RST~DATABRICKS_DWH_SAMPLES_TPCDS_SF1.store~~21 Sept, 13:14
@RST~DATABRICKS_DWH_SAMPLES_TPCDS_SF1.call_center~~21 Sept, 13:14
@RST~DATABRICKS_DWH_SAMPLES_CLICKBENCH.hits~~21 Sept, 13:14
@RST~DATABRICKS_DWH_SAMPLES_BAKEHOUSE.sales_transactions~~21 Sept, 13:00
@RST~DATABRICKS_DWH_SAMPLES_BAKEHOUSE.sales_customers~~21 Sept, 13:00
T~INT.CUSTOMER~~20 Sept, 07:51~Priya~
T~BI.Customer 360 Dashboard~Admin~20 Sept, 07:47~Rajesh~
@ST~STG.CUSTOMER_ORDER_LIVE_RPLUS~Admin~20 Sept, 07:47
@ST~STG.CUSTOMER_ORDER~Admin~20 Sept, 07:47
@ST~S3_ENR.CUSTOMER_ORDERS~~20 Sept, 07:39
@RST~API.GET_customers~~20 Sept, 07:39
@RST~PETSTORE_API_API.POST_user_createWithList~~20 Sept, 07:39
@RST~PETSTORE_API_API.POST_user~~20 Sept, 07:39
@RST~API.GET_customers_customerId~~20 Sept, 07:39
@RS~PRL.ORDER_MASTER~~20 Sept, 07:39
@RST~PETSTORE_API_API.GET_user_username~~20 Sept, 07:39
Order master refreshed daily failed: last change 446.0 h ago, expected within 24 h~PRL.ORDER_MASTER~self-remediation~20 Sept, 06:39~~
Nulls found in ACCOUNT_BALANCE~SRC.CUSTOMER~Priya Shah~19 Sept, 15:44~Rajesh~resolved by Rajesh: Back-filled from the source ledger`;
export const QUALITY_ISSUES = QI.split('\n').flatMap((l) => {
  const p = l.split('~');
  if (p[0].startsWith('@')) return [...p[0].slice(1)].map((k) => [k, p[1], p[2], p[3], '', '']);
  return [p];
}).map(([k, asset, by, at, routed, status], i) => ({
  id: `q${i}`, title: RULE[k] || k, asset, by: by || 'scheduler', at: `${at.replace(',', ' 2026,')}`, routed: routed || '', status: status || 'open',
}));

/* audit trail — the scheduler re-raises the GDPR checks on 17 assets every run; older entries are the assignments above */
const CYCLE = [['S', 'RPLUS_DATABRICKS_RPLUS_DEMO_2RPLUS_SILVER.esa'],
  ...['3rplus_silver_uc_curated', '2rplus_silver_pip_uc', '1rplus_silver_esa_jsaps'].flatMap((t) => [['R', `RPLUS_DATABRICKS_RPLUS_DEMO_2RPLUS_SILVER.${t}`], ['S', `RPLUS_DATABRICKS_RPLUS_DEMO_2RPLUS_SILVER.${t}`]]),
  ...['rplus_bronze_hb', '4rplus_bronze_uc', '3rplus_bronze_pip', '2rplus_bronze_jsaps', '1rplus_bronze_esa'].flatMap((t) => [['R', `RPLUS_DATABRICKS_RPLUS_DEMO_1RPLUS_BRONZE.${t}`], ['S', `RPLUS_DATABRICKS_RPLUS_DEMO_1RPLUS_BRONZE.${t}`]])];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const fmt = (d) => `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
const raise = (k) => `raised quality issue “${RULE[k]}” → no steward`;
const scheduled = [];
for (let c = 0; scheduled.length < 2985; c += 1) {
  const t0 = Date.UTC(2026, 9, 2, 8, 15) - c * 16.6 * 60000;
  CYCLE.forEach(([k, a], j) => { if (scheduled.length < 2985) scheduled.push({ at: fmt(new Date(t0 - (j > 10 ? 60000 : 0))), who: 'scheduler', action: 'quality.raise', on: a, what: raise(k), cat: 'ownership.quality' }); });
}
const older = [
  { at: '24 Sept 2026, 08:49', who: 'Admin', action: 'ownership.assign', on: 'INT.NATION', what: 'Data custodian → steward', cat: 'ownership.assign' },
  { at: '24 Sept 2026, 08:49', who: 'Admin', action: 'ownership.assign', on: 'INT.LINEITEM', what: 'Data custodian → steward', cat: 'ownership.assign' },
  { at: '24 Sept 2026, 08:12', who: 'Admin', action: 'ownership.assign', on: 'INT.CUSTOMER', what: 'Data custodian → steward', cat: 'ownership.assign' },
  { at: '24 Sept 2026, 07:09', who: 'Admin', action: 'quality.resolve', on: 'STREAMING.customer-value', what: 'resolved quality issue — test', cat: 'ownership.quality' },
  { at: '24 Sept 2026, 07:04', who: 'Admin', action: 'ownership.model', on: 'governance model v6', what: 'removed role Data Analyst', cat: 'ownership.model' },
  { at: '24 Sept 2026, 07:03', who: 'Admin', action: 'ownership.assign', on: 'INT.CUSTOMER', what: 'data-analyst → Muni', cat: 'ownership.assign' },
  { at: '24 Sept 2026, 07:01', who: 'Admin', action: 'ownership.model', on: 'governance model v5', what: 'changed role Data Analyst', cat: 'ownership.model' },
  { at: '24 Sept 2026, 07:00', who: 'Admin', action: 'ownership.model', on: 'governance model v4', what: 'created bespoke role Data Analyst', cat: 'ownership.model' },
  { at: T1, who: 'Admin', action: 'ownership.change.approve', on: 'BI.Supplier Performance', what: 'approved owner change → Meera Shah (test user)', cat: 'ownership.change' },
  { at: T1, who: 'Raghav', action: 'ownership.change.request', on: 'BI.Supplier Performance', what: 'requested owner → Meera Shah (test user): Supplier reporting moves to procurement', cat: 'ownership.change' },
  { at: T1, who: 'Rajesh', action: 'quality.resolve', on: 'SRC.CUSTOMER', what: 'resolved “Nulls found in ACCOUNT_BALANCE” — Back-filled from the source ledger', cat: 'ownership.quality' },
  { at: T1, who: 'Admin', action: 'ownership.model', on: 'governance model v3', what: 'access policy for Confidential set (owner or steward, 120 days, justification, mask sensitive)', cat: 'ownership.model' },
  { at: T1, who: 'Admin', action: 'ownership.model', on: 'governance model v2', what: 'created bespoke role Privacy lead', cat: 'ownership.model' },
  { at: T1, who: 'Admin', action: 'ownership.assign', on: 'dataset SRC', what: 'Privacy lead → Dana Whitfield (test user) (inherited by 6 tables)', cat: 'ownership.assign' },
  { at: T1, who: 'Admin', action: 'ownership.assign', on: 'dataset INT', what: 'Data steward → Rajesh (inherited by 5 tables)', cat: 'ownership.assign' },
];
export const AUDIT_TRAIL = [...scheduled, ...older];
export const AUDIT_FILTERS = [['', 'All actions'], ['ownership.assign', 'Assignments'], ['ownership.change', 'Change requests'], ['ownership.model', 'Governance model'], ['ownership.quality', 'Quality'], ['access', 'Access'], ['ownership.denied', 'Refused actions']];

/* review queue — classification reviews (Classifier, AI) and ownership gaps (metadata scan) */
const LBL = { P: 'PII', C: 'CREDENTIAL', F: 'FINANCIAL', S: 'SPECIAL_CATEGORY', G: 'GOVERNMENT_ID', M: 'COMMERCIAL' };
export const LABEL_REASON = {
  PII: 'Matches PII patterns — name/identifier that can be linked to a person', FINANCIAL: 'Matches financial patterns — balance, price or amount fields',
  SPECIAL_CATEGORY: 'Matches special_category classification patterns', GOVERNMENT_ID: 'Matches government_id classification patterns',
  CREDENTIAL: 'Matches credential classification patterns', COMMERCIAL: 'Matches commercial classification patterns',
};
const DWP = (x) => ['PHsource_name', 'PHsurname', 'PHforename_1', 'PHforename_2', 'PHpostcode', 'PHaddress_verified', 'PHaddress_start_date', 'PHaddress_status_type', 'PHaddress_type_key', 'PHtelephone_no_home', 'GMnino', 'SMdate_of_birth', 'SMdate_of_birth_verified', `FM${x ? `${x}_` : ''}benifit_amount`, `FM${x ? `${x}_` : ''}benifit_amount_ytd`];
const DOMAIN_SETS = {
  Customer: /customer|churn|customer_360|high_value/i,
  Orders: /(^|\.)(orders?|ORDERS|order_items|order_summary_monthly|POST_orders|GET_orders|ORDER_MASTER|ORDER_ITEM_SUMMARY|Order Revenue Report|POST_store_order|DELETE_store_order_orderId|GET_store_order_orderId)$/,
  Products: /(^|\.)(part|partsupp|products|product_performance|PART)$/,
  Suppliers: /(^|\.)(supplier|sales_suppliers|SUPPLIER|Supplier Performance)$/,
  Geography: /(^|\.)(region|nation|NATION|destinations)$/,
  'Order items': /(^|\.)(lineitem|item|LINEITEM)$/,
};
export const domainOf = (a) => {
  const t = a.slice(a.indexOf('.') + 1);
  if (/^RPLUS_DATA_LAKE_ADLS_(CLN|RAW)\.order_items$|RPLUS2_GENMETA_DEMO\.order_items$/.test(a)) return 'Orders';
  for (const [d, re] of Object.entries(DOMAIN_SETS)) if (re.test(d === 'Customer' ? t : a)) return d;
  return 'Other';
};
const regBy = Object.fromEntries(REGISTER.map((r) => [r.asset, r]));
export const QUEUE = RQ.split('\n').flatMap((l, i) => {
  const [asset, op, cols] = l.split('~');
  const list = cols.startsWith('@DWP:') ? DWP(cols.slice(5)) : cols ? cols.split(',') : [];
  const r = regBy[asset];
  const name = asset.slice(asset.indexOf('.') + 1);
  const cls = list.map((c, j) => ({
    id: `c${i}-${j}`, priority: c[1] === 'H' ? 'High' : 'Medium', type: 'Classification', label: LBL[c[0]], column: c.slice(2), asset,
    task: `${LBL[c[0]]} classification review for ${c.slice(2)}`, by: 'Classifier (AI)', status: 'In review', system: r?.system || '—', domain: domainOf(asset),
  }));
  const sens = list.length;
  const own = { id: `o${i}`, priority: op === 'H' ? 'High' : 'Medium', type: 'Ownership', asset, task: `Assign an owner for ${name}`, by: 'Metadata scan', status: 'Open', system: r?.system || '—', domain: domainOf(asset),
    reason: sens ? `${sens} sensitive column${sens > 1 ? 's' : ''} and no accountable owner` : 'No accountable owner' };
  return [...cls.filter((c) => c.priority === 'High'), own, ...cls.filter((c) => c.priority !== 'High')];
}).sort((a, b) => (a.priority === b.priority ? 0 : a.priority === 'High' ? -1 : 1));
