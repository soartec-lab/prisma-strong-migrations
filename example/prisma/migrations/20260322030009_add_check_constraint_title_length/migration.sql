-- AddCheckConstraint
ALTER TABLE "posts" ADD CONSTRAINT "posts_title_length_check" CHECK (length("title") > 0) NOT VALID;
ALTER TABLE "posts" VALIDATE CONSTRAINT "posts_title_length_check";
