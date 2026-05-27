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
-- Table structure for table `papercut_import_jobs`
--

DROP TABLE IF EXISTS `papercut_import_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `papercut_import_jobs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `usuario_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `provincia_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `departamento_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome_lote` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('processing','completed','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'processing',
  `total_linhas` int NOT NULL DEFAULT '0',
  `linhas_inseridas` int NOT NULL DEFAULT '0',
  `linhas_duplicadas` int NOT NULL DEFAULT '0',
  `linhas_erro` int NOT NULL DEFAULT '0',
  `mensagem_erro` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `log_processamento` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `papercut_job_user_idx` (`usuario_id`),
  KEY `fk_pc_job_prov` (`provincia_id`),
  KEY `fk_pc_job_dept` (`departamento_id`),
  CONSTRAINT `fk_pc_job_dept` FOREIGN KEY (`departamento_id`) REFERENCES `departamentos_gestao` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_pc_job_prov` FOREIGN KEY (`provincia_id`) REFERENCES `provincias` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_pc_job_user` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `papercut_import_jobs`
--

LOCK TABLES `papercut_import_jobs` WRITE;
/*!40000 ALTER TABLE `papercut_import_jobs` DISABLE KEYS */;
INSERT INTO `papercut_import_jobs` VALUES ('01312bf4-8a78-48f8-961e-bdff3666ea31','00000000-0000-4000-8000-000000000001','b1a0dac1-4fb3-11f1-955a-a4bb6d171c32','b1a7c783-4fb3-11f1-955a-a4bb6d171c32',NULL,'completed',19,19,0,0,NULL,'Ficheiro 1: 19 linhas válidas, 0 erros de linha','2026-05-14 18:46:36.000','2026-05-14 18:46:36.000'),('40c3d155-9779-4620-8f98-9022cc502b7b','00000000-0000-4000-8000-000000000001','b1a0dac1-4fb3-11f1-955a-a4bb6d171c32','5db8f378-4fb6-11f1-955a-a4bb6d171c32',NULL,'failed',0,0,0,0,'Colunas em falta no CSV: time, user, pages, copies, printer, document','','2026-05-14 17:34:03.000','2026-05-14 17:34:03.000'),('4c606db6-7879-4a7e-ab9b-410bb6c625cd','00000000-0000-4000-8000-000000000001','b1a0dac1-4fb3-11f1-955a-a4bb6d171c32','5db8f378-4fb6-11f1-955a-a4bb6d171c32',NULL,'completed',25,25,0,0,NULL,'Ficheiro 1: 25 linhas válidas, 0 erros de linha','2026-05-14 17:38:53.000','2026-05-14 17:38:53.000');
/*!40000 ALTER TABLE `papercut_import_jobs` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-27  2:35:45
