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
-- Table structure for table `consumiveis_registos`
--

DROP TABLE IF EXISTS `consumiveis_registos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consumiveis_registos` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `provincia_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `departamento_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('papel_a4','envelope','toner','agrafos') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantidade` decimal(14,4) NOT NULL,
  `preco_unitario` decimal(16,6) NOT NULL,
  `preco_total` decimal(18,6) NOT NULL,
  `data_aquisicao` date NOT NULL,
  `data_termino` date DEFAULT NULL,
  `observacoes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `registado_por_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `consum_reg_prov_dept_idx` (`provincia_id`,`departamento_id`),
  KEY `consum_reg_tipo_data_idx` (`tipo`,`data_aquisicao`),
  KEY `fk_consum_dept` (`departamento_id`),
  KEY `idx_consumivel_registado_por` (`registado_por_id`),
  CONSTRAINT `fk_consum_dept` FOREIGN KEY (`departamento_id`) REFERENCES `departamentos_gestao` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_consum_prov` FOREIGN KEY (`provincia_id`) REFERENCES `provincias` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_consumivel_registado_por` FOREIGN KEY (`registado_por_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `consumiveis_registos`
--

LOCK TABLES `consumiveis_registos` WRITE;
/*!40000 ALTER TABLE `consumiveis_registos` DISABLE KEYS */;
INSERT INTO `consumiveis_registos` VALUES ('74f3aeeb-ea1b-4166-af89-f183a2c558f7','b1a0dac1-4fb3-11f1-955a-a4bb6d171c32','b1a7c783-4fb3-11f1-955a-a4bb6d171c32','toner',2.0000,77720.000000,155440.000000,'2026-05-13',NULL,'Toner da impressora central da Sede (REF: Toner Minolta TN 328)','2026-05-18 08:24:00.000','2026-05-18 08:30:29.000','00000000-0000-4000-8000-000000000001'),('8d83b60b-89ef-453b-820f-3e19d0891aaa','b1a13d4a-4fb3-11f1-955a-a4bb6d171c32','b1a7c783-4fb3-11f1-955a-a4bb6d171c32','papel_a4',1.0000,1750.000000,1750.000000,'2026-05-15',NULL,'roxbusiness','2026-05-15 09:33:51.000','2026-05-15 09:33:51.000','00000000-0000-4000-8000-000000000001'),('ebbb1178-226b-4991-a280-5dcdf723d860','b1a0dac1-4fb3-11f1-955a-a4bb6d171c32','b1a80adf-4fb3-11f1-955a-a4bb6d171c32','toner',1.0000,69020.000000,69020.000000,'2026-05-13',NULL,'Toner da Comerical (HP 230) note que Falta toner preto, o fornecer ainda não tem disponivel','2026-05-18 08:13:00.000','2026-05-18 08:25:21.000','00000000-0000-4000-8000-000000000001');
/*!40000 ALTER TABLE `consumiveis_registos` ENABLE KEYS */;
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
