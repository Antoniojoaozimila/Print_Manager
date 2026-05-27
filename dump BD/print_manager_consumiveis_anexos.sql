-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: print_manager
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `consumiveis_anexos`
--

DROP TABLE IF EXISTS `consumiveis_anexos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consumiveis_anexos` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `consumivel_registo_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome_original` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `caminho_relativo` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tamanho_bytes` int unsigned NOT NULL DEFAULT '0',
  `documento_tipo` enum('cotacao','fatura','recibo','comprovativo_pagamento','outro') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'outro',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_anexo_registo` (`consumivel_registo_id`),
  CONSTRAINT `fk_anexo_consumivel` FOREIGN KEY (`consumivel_registo_id`) REFERENCES `consumiveis_registos` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `consumiveis_anexos`
--

LOCK TABLES `consumiveis_anexos` WRITE;
/*!40000 ALTER TABLE `consumiveis_anexos` DISABLE KEYS */;
INSERT INTO `consumiveis_anexos` VALUES ('0d2c2bce-0756-4474-9ef6-2bfaf3b8851f','74f3aeeb-ea1b-4166-af89-f183a2c558f7','Pro-forma 47.pdf','74f3aeeb-ea1b-4166-af89-f183a2c558f7/d6b2b607-6d64-45e6-b9d3-69954bbef54e_Pro-forma_47.pdf','application/pdf',75272,'cotacao','2026-05-18 08:24:01','2026-05-18 08:24:01'),('4a7f1624-59c0-4eab-9767-c3202a74fe5e','ebbb1178-226b-4991-a280-5dcdf723d860','Factura 27.pdf','ebbb1178-226b-4991-a280-5dcdf723d860/4f66f923-e802-4a92-9637-35d48081fea6_Factura_27.pdf','application/pdf',74614,'fatura','2026-05-18 08:13:00','2026-05-18 08:13:00'),('5c939ea3-16ab-4028-b3a4-b9a0458962b5','74f3aeeb-ea1b-4166-af89-f183a2c558f7','Pro-forma 47.pdf','74f3aeeb-ea1b-4166-af89-f183a2c558f7/6aa24153-f9b6-4b2d-838a-088ce5245131_Pro-forma_47.pdf','application/pdf',75272,'fatura','2026-05-18 08:24:01','2026-05-18 08:24:01'),('7026c2bd-43e5-4427-9a23-74fc2cef817d','ebbb1178-226b-4991-a280-5dcdf723d860','TONER HP 230.pdf','ebbb1178-226b-4991-a280-5dcdf723d860/1f75c3c2-7cd0-4a78-b273-e6f0c030cd9d_TONER_HP_230.pdf','application/pdf',42856,'comprovativo_pagamento','2026-05-18 08:13:00','2026-05-18 08:13:00'),('88b2b00f-3f80-49e7-8339-204a233822b2','ebbb1178-226b-4991-a280-5dcdf723d860','Recibo 26.pdf','ebbb1178-226b-4991-a280-5dcdf723d860/73c6484c-472c-46cf-ada9-b0896d47aff3_Recibo_26.pdf','application/pdf',42565,'recibo','2026-05-18 08:13:00','2026-05-18 08:13:00'),('9d989d37-c8fc-48b4-880e-536c5615381e','74f3aeeb-ea1b-4166-af89-f183a2c558f7','TONER SEDE.pdf','74f3aeeb-ea1b-4166-af89-f183a2c558f7/ffdf33d2-95f8-4dd2-ac28-0f1fd84c8e25_TONER_SEDE.pdf','application/pdf',42940,'comprovativo_pagamento','2026-05-18 08:24:01','2026-05-18 08:24:01'),('d8bea2e0-e206-4393-b5b3-c944d23e3961','74f3aeeb-ea1b-4166-af89-f183a2c558f7','Recibo 27.pdf','74f3aeeb-ea1b-4166-af89-f183a2c558f7/8186c2a9-197f-45b6-8e76-2995ab76fac8_Recibo_27.pdf','application/pdf',42965,'comprovativo_pagamento','2026-05-18 08:24:01','2026-05-18 08:24:01'),('df738abc-8cb9-4699-801e-38883c994f00','8d83b60b-89ef-453b-820f-3e19d0891aaa','Factura 29.pdf','8d83b60b-89ef-453b-820f-3e19d0891aaa/b9a55ee8-7b61-4b05-b353-a5776940c3aa_Factura_29.pdf','application/pdf',75785,'fatura','2026-05-15 09:33:51','2026-05-15 09:33:51'),('eb7cb7e9-2c6f-4cfc-beb2-aafcd8e90f43','ebbb1178-226b-4991-a280-5dcdf723d860','Pro-forma 44.pdf','ebbb1178-226b-4991-a280-5dcdf723d860/8586e72f-4380-4b49-9e51-e9f95afbf763_Pro-forma_44.pdf','application/pdf',74723,'cotacao','2026-05-18 08:13:00','2026-05-18 08:13:00');
/*!40000 ALTER TABLE `consumiveis_anexos` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-27  2:35:46
