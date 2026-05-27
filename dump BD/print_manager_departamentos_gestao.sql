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
-- Table structure for table `departamentos_gestao`
--

DROP TABLE IF EXISTS `departamentos_gestao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departamentos_gestao` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `nome` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ordem` int NOT NULL DEFAULT '0',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `dept_gestao_nome_uq` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departamentos_gestao`
--

LOCK TABLES `departamentos_gestao` WRITE;
/*!40000 ALTER TABLE `departamentos_gestao` DISABLE KEYS */;
INSERT INTO `departamentos_gestao` VALUES ('5db8f378-4fb6-11f1-955a-a4bb6d171c32','Informática',9,1,'2026-05-14 19:00:10.018','2026-05-14 19:00:10.018'),('b1a7c783-4fb3-11f1-955a-a4bb6d171c32','Subscrição',1,1,'2026-05-14 18:41:02.336','2026-05-14 18:41:02.336'),('b1a7ff46-4fb3-11f1-955a-a4bb6d171c32','Recursos Humanos',2,1,'2026-05-14 18:41:02.336','2026-05-14 18:41:02.336'),('b1a807ae-4fb3-11f1-955a-a4bb6d171c32','Risco e Conformidade',3,1,'2026-05-14 18:41:02.336','2026-05-14 18:41:02.336'),('b1a80adf-4fb3-11f1-955a-a4bb6d171c32','Comercial',4,1,'2026-05-14 18:41:02.336','2026-05-14 18:41:02.336'),('b1a80cfb-4fb3-11f1-955a-a4bb6d171c32','Jurídico',5,1,'2026-05-14 18:41:02.336','2026-05-14 18:41:02.336'),('b1a80f11-4fb3-11f1-955a-a4bb6d171c32','Sinistros',6,1,'2026-05-14 18:41:02.336','2026-05-14 18:41:02.336'),('b1a81176-4fb3-11f1-955a-a4bb6d171c32','Contabilidade',7,1,'2026-05-14 18:41:02.336','2026-05-14 18:41:02.336'),('b1a8136f-4fb3-11f1-955a-a4bb6d171c32','Credit Control',8,1,'2026-05-14 18:41:02.336','2026-05-14 18:41:02.336');
/*!40000 ALTER TABLE `departamentos_gestao` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-27  2:35:43
